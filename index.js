var through = require('through2');
var dot = require('dot');
var gutil = require('gulp-util');
var path = require('path');
var fs = require('fs');
var glob = require('glob');

var PLUGIN_NAME = 'gulp-dot-preparse';

var opts = {};

var transFn = function (fileContents,opts,cb) {
	//do something with file contents
	cb(fileContents);
};

opts.__proto__.injectDefChunk = function (defPaths) {
	for (var i = 0; i < defPaths.length; i++) {
		var defName = path.basename(defPaths[i],path.extname(defPaths[i]));
		if (opts.__includes[defName]) {
			gutil.log(gutil.colors.bold.red(path.basename(defPaths[i]) + '文件有重复，只会选取路径最浅的那个，也就是第一个'));
			continue;
		}
		opts.__includes[defName] = readData(defPaths[i]);
	}
};

opts.__proto__.compile_to_UMD_module = function (modulename, template, def) {
	def = def || {};
	var defs = copy(this.__includes, copy(def))
		, settings = this.__settings || doT.templateSettings
		, compileoptions = copy(settings)
		, defaultcompiled = doT.template(template, settings, defs)
		, exports = []
		, compiled = ""
		, fn;
	
	for (var property in defs) {
		if (defs[property] !== def[property] && defs[property] !== this.__includes[property]) {
			fn = undefined;
			if (typeof defs[property] === 'string') {
				fn = doT.template(defs[property], settings, defs);
			} else if (typeof defs[property] === 'function') {
				fn = defs[property];
			} else if (defs[property].arg) {
				compileoptions.varname = defs[property].arg;
				fn = doT.template(defs[property].text, compileoptions, defs);
			}
			if (fn) {
				compiled += fn.toString().replace('anonymous', property);
				exports.push(property);
			}
		}
	}
	compiled += defaultcompiled.toString().replace('anonymous', modulename);
	return "(function(){" + compiled
		   + "var itself=" + modulename + ", _encodeHTML=(" + doT.encodeHTMLSource.toString() + "(" + (settings.doNotSkipEncoded || '') + "));"
		   + addexports(exports)
		   + "if(typeof module!=='undefined' && module.exports) module.exports=itself;else if(typeof define==='function')define(function(){return itself;});else {"
		   + this.__global + "=" + this.__global + "||{};" + this.__global + "['" + modulename + "']=itself;}}());";
};

var readData = function (path) {
	var data = fs.readFileSync(path);
	if (data) return data.toString();
	console.log("problems with " + path);
};

var addExports = function (exports) {
	var ret = '';
	for (var i=0; i< exports.length; i++) {
		ret += "itself." + exports[i]+ "=" + exports[i]+";";
	}
	return ret;
};

var copy = function (o,to) {
	to = to || {};
	for (var property in o) {
		to[property] = o[property];
	}
	return to;
};

module.exports = function (options) {
	options = options || {};
	(function (o) {
		this.__root 		= o.root? path.resolve(o.root) : path.resolve(process.cwd());
		this.__global		= o.global || 'window.dotTemplateRender';
		this.__settings 	= o.templateSettings ? copy(o.templateSettings, copy(doT.templateSettings)) : undefined;
		this.__includes		= {};
	}).call(opts,options);
	
	var defPaths = glob.sync(path.join(opts.__root,'/**/*.def'));
	
	opts.injectDefChunk(defPaths);
	
	console.log(opts);
	
	return through.obj(function (file, encoding, cb) {
		var _this = this;
		if (file.isNull() || file.isDirectory()) {
			return cb(null,file);
		}
		
		if (file.isStream()) {
			return cb(new gutil.PluginError(PLUGIN_NAME, 'Streaming not supported'));
		}
		
		if (file.isBuffer()) {
			var fileContents = file.contents.toString();
			var ext = path.extname(file.path);
			var fileName = path.basename(file.path);
			var fileNameWithOutExt = path.basename(file.path,ext);
			
			if (/\.def(\.dot|\.jst)?$/.test(fileName)) {
				opts.__includes[fileNameWithOutExt] = fileContents;
			}
			
			transFn(fileContents,opts, function  (fileContents) {
				file.path = gutil.replaceExtension(file.path, '.js');
				file.contents = new Buffer(fileContents);
				_this.push(file);
				cb();
			});
		}
	});
};
