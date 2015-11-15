'use strict';

/*************
 * Variables *
 *************/

//Load gulp and its associated plugins through the plugin autoloader
var gulp = require('gulp'),
	http = require('http'),
	plugins = require('gulp-load-plugins')({
		//Add a prefix for each dependency that is not specific to gulp
		pattern: ['gulp-*', 'gulp.*', 'browser-sync']
	}),
	//We load the configuration file
	config = require('./gulp-config');


/********************
 * Helper functions *
 ********************/

//Notify on console
var notifyConsole = function(msg, type)
{
	msg = (msg instanceof Array) ? msg.join('\n') : msg;

	plugins.util.log(msg);
};

//Notify via browser-sync
var notifyBrowserSync = function(msg, type)
{
	var msgTimeout = config.global.notifications.timeout;

	//Notification timeout
	if( type === 'error' ) {
		msgTimeout = config.global.notifications.errorTimeout;
	}

	msg = (msg instanceof Array) ? msg.join('<br />') : msg;
	msg = '<div style="text-align:left;">' + msg + '</div>';

	//Easter egg: we will optionally display a logo here
	if( 'logo' in config.global.notifications && config.global.notifications.logo.length > 0 ) {
		msg = msg + '<div style="text-align:right;"><img src="' + config.global.notifications.logo + '" width="32" /></div>';
	}

	plugins.browserSync.notify(msg, msgTimeout);
};

//Notifications
var notify = function(msg, type)
{
	type = (type === 'undefined') ? 'info' : 'error';
	notifyConsole(msg, type);
	notifyBrowserSync(msg, type);
};

//Error handler
var handleError = function(error)
{
	var msg = [];
	msg.push('Error: ' + error.message);
	msg.push('File name: ' + error.fileName);
	msg.push('Line number: ' + error.lineNumber);

	notify(msg);
};


/*********
 * Tasks *
 *********/

//Start browser-sync
gulp.task('startBrowserSync', function() {
	plugins.browserSync( config.browserSync );
});

//Reload browser-sync
gulp.task('reloadBrowserSync', function() {
	plugins.browserSync.reload();
});

//Compile styles
gulp.task('compileStyles', function() {
	notify('Compiling styles');

	var stream = gulp.src( config.css.src )
		.pipe(plugins.plumber({ errorHandler: function(error) {
				handleError(error);
				this.emit('end');
			}
		}))
		.pipe(plugins.sass())
		.pipe(plugins.autoprefixer( config.autoprefixer ))
		.pipe(gulp.dest( config.css.dest ))
		.pipe(gulp.dest( config.css.jekyllDest ))
		.pipe(plugins.browserSync.reload( {stream:true} ))
		.pipe(plugins.rename({suffix:'.min'}))
		.pipe(plugins.minifyCss())
		.pipe(gulp.dest( config.css.jekyllDest ))
		.pipe(plugins.browserSync.reload( {stream:true} ));

	return stream;
});

//Check scripts
gulp.task('checkScripts', function() {
	notify('Checking scripts');

	var stream = gulp.src( config.js.src )
		.pipe(plugins.plumber({ errorHandler: handleError }))
		.pipe(plugins.eslint( config.eslint ))
		.pipe(plugins.eslint.format())
		.pipe(plugins.eslint.failAfterError());

	return stream;
});

//Compile scripts
gulp.task('compileScripts', ['checkScripts'],function() {
	notify('Compiling scripts');

	var stream = gulp.src( config.js.src )
		.pipe(plugins.concat( config.js.bundleFileName ))
		.pipe(gulp.dest( config.js.dest ))
		.pipe(plugins.rename( config.js.bundleFileName.replace('.js', '.min.js') ))
		.pipe(plugins.uglify())
		.pipe(gulp.dest( config.js.dest ));

	return stream;
});

//Optimize images
gulp.task('optimizeImages', function() {
	notify('Optimizing images');

	var stream = gulp.src( config.img.src )
		.pipe(plugins.imagemin( config.imagemin ))
		.pipe(gulp.dest( config.img.dest ));
});

//Monitor file changes
gulp.task('watchFiles', function() {
	for(var patterns in config.watchFiles ) {
		var tasks = config.watchFiles[patterns],
			patternsList = patterns.split(',');

		notify('Files matching "' + patterns + '" should launch the following task(s): ' + tasks.join(',') );

		gulp.watch(patternsList, tasks);
	}
});

//Jekyll build
gulp.task('jekyll', function (gulpCallBack){
	var spawn = require('child_process').spawn;
	var jekyll = spawn('jekyll', ['build'], {stdio: 'inherit'});

	jekyll.on('exit', function(code) {
		gulpCallBack(code === 0 ? null : 'ERROR: Jekyll process exited with code: '+code);
		plugins.browserSync.reload();
	});
 });

//Create tasks defined in the configuration
for(var task in config.tasks) {
	var subtasks = config.tasks[task];
	gulp.task(task, subtasks);
}