var through = require('through2');
var doT = require('dot');
var gutil = require('gulp-util');
var path = require('path');
var fs = require('fs');
var glob = require('glob');

var PLUGIN_NAME = 'gulp-dot-preparse';

var opts;

var OPTS = function (o) {
	this.__root 		= o.root? path.resolve(o.root) : path.resolve(process.cwd());
	this.__global		= o.global || 'window.dotTemplateRender';
	this.__settings 	= o.templateSettings ? copy(o.templateSettings, copy(doT.templateSettings)) : undefined;
	this.__includes		= {};
};

OPTS.prototype.injectDefChunk = function (defPaths) {
	for (var i = 0; i < defPaths.length; i++) {
		var defName = path.basename(defPaths[i],path.extname(defPaths[i]));
		if (opts.__includes[defName]) {
			gutil.log(gutil.colors.bold.red(path.basename(defPaths[i]) + 'file is more than one ,it only use the first which matched by glob'));
			continue;
		}
		opts.__includes[defName] = readData(defPaths[i]);
	}
};

OPTS.prototype.compile_to_UMD_module = function (nameObj, template, def) {
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
	compiled += defaultcompiled.toString().replace('anonymous', nameObj.modulename);
	return "(function(){" + compiled
		   + "var itself=" + nameObj.modulename + ", _encodeHTML=(" + doT.encodeHTMLSource.toString() + "(" + (settings.doNotSkipEncoded || '') + "));"
		   + addExports(exports)
		   + "if(typeof module!=='undefined' && module.exports) module.exports=itself;else if(typeof define==='function')define(function(){return itself;});else {"
		   + this.__global + "=" + this.__global + "||{};" + this.__global + "['" + nameObj.modulename_source + "']=itself;}}());";
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
	opts = new OPTS(options);
	
	var defPaths = glob.sync(path.join(opts.__root,'/**/*.def'));
	
	opts.injectDefChunk(defPaths);
	
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
			var modulename_source = path.basename(file.path,ext);
			var modulename = modulename_source.replace(/\-/g,'').toUpperCase();
			
			if (!/\.jst/.test(ext)) {
				return cb(new gutil.PluginError(PLUGIN_NAME, 'File extname is not supported'));
			}
			
			file.path = gutil.replaceExtension(file.path, '.js');
			file.contents = new Buffer(opts.compile_to_UMD_module({modulename: modulename,modulename_source: modulename_source}, fileContents));
			_this.push(file);
			cb();
		}
	});
};
