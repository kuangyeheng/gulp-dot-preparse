# gulp-dot-preparse

> Compile [dot](https://github.com/olado/doT) template to UMD `.js` file

## Install

```sh
$ npm install gulp-dot-preparse --save-dev
```

## Usage

```javascript
var dotPreparse = require('gulp-dot-preparse');

gulp.task('default', function(){
	return gulp.src('template/**/*.jst')
		.pipe(dotPreparse({
			root: './template'
		}))
		.pipe(gulp.dest('./dist'));
});
```

## Options

#### root
Type: `String`

Default: `process.cwd()`

Root of  `.def` file.

#### global
Type: `String`

Default: `window.dotTemplateRender`

When use template with `script` tag,template `function` will inject to `window.dotTemplateRender`.

#### templateSettings
Type: `Object`

Default:
```javascript
templateSettings: {
	evaluate:    /\{\{([\s\S]+?(\}?)+)\}\}/g,
	interpolate: /\{\{=([\s\S]+?)\}\}/g,
	encode:      /\{\{!([\s\S]+?)\}\}/g,
	use:         /\{\{#([\s\S]+?)\}\}/g,
	useParams:   /(^|[^\w$])def(?:\.|\[[\'\"])([\w$\.]+)(?:[\'\"]\])?\s*\:\s*([\w$\.]+|\"[^\"]+\"|\'[^\']+\'|\{[^\}]+\})/g,
	define:      /\{\{##\s*([\w\.$]+)\s*(\:|=)([\s\S]+?)#\}\}/g,
	defineParams:/^\s*([\w$]+):([\s\S]+)/,
	conditional: /\{\{\?(\?)?\s*([\s\S]*?)\s*\}\}/g,
	iterate:     /\{\{~\s*(?:\}\}|([\s\S]+?)\s*\:\s*([\w$]+)\s*(?:\:\s*([\w$]+))?\s*\}\})/g,
	varname:	"it",
	strip:		true,
	append:		true,
	selfcontained: false,
	doNotSkipEncoded: false
}
```
