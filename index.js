var through = require('through2');
var dot = require('dot');
var gutil = require('gulp-util');
var path = require('path');
var fs = require('fs');
var glob = require('glob');

var PLUGIN_NAME = 'gulp-dot-preparse';

var opts = {};

var defFilesName;

var transFn = function (fileContents,opts,cb) {
	//do something with file contents
	cb(fileContents);
};

var injectDefChunk = function () {
	for (var i = 0; i < defFilesName.length; i++) {
		opts.__includes[gutil.replaceExtension(path.relative(opts.__root,defFilesName[i]),'')] = readData(defFilesName[i]);
	}
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
	
	defFilesName = glob.sync(path.join(opts.__root,'/**/*.def'));
	
	injectDefChunk();
	
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