/* browserify task
   ---------------
   Bundle javascripty things with browserify!
   This task is set up to generate multiple separate bundles, from
   different sources, and to use Watchify when run from the default task.
   See browserify.bundleConfigs in gulp/config.js
*/
var browserify   = require('browserify');
var browserSync  = require('browser-sync');
var watchify     = require('watchify');
var gulp         = require('gulp');
var gutil        = require('gulp-util');
var source       = require('vinyl-source-stream');
var buffer       = require('vinyl-buffer');
var config       = require('../config').scripts;
var _            = require('underscore');
var babelify    = require('babelify');
var notify       = require('gulp-notify');
var sourcemaps   = require('gulp-sourcemaps');

var production = process.env.NODE_ENV === 'production';

var scripts = function(callback, devMode) {

  var bundleQueue = config.bundleConfigs.length;

  var browserifyThis = function(bundleConfig) {

    if(devMode) {
      // Add watchify args and debug (sourcemaps) option
      _.extend(bundleConfig, watchify.args, { debug: true });
    }

    var bundler = devMode ? watchify(browserify(bundleConfig)) : browserify(bundleConfig);

    // add in transforms, requires and externals from the config
    bundler.transform(babelify);
    if(bundleConfig.require) bundler.require(bundleConfig.require);
    if(bundleConfig.external) bundler.external(bundleConfig.external);

    var bundle = function() {

      return bundler
        .bundle()
        // Report compile errors
        .on('error', notify.onError({
          title: "JS Compile Error",
          message: "<%= error.message %>"
        }))
        // Use vinyl-source-stream to make the
        // stream gulp compatible. Specify the
        // desired output filename here.
        .pipe(source(bundleConfig.outputName))
        .pipe(buffer())
          .pipe(sourcemaps.init()) // loads map from browserify file
          .pipe(sourcemaps.write('./')) // writes .map file
        // Specify the output destination
        .pipe(gulp.dest(bundleConfig.dest))
        .on('end', reportFinished)
        .pipe(browserSync.reload({stream:true}));
    };



    if(devMode) {
      // Rebundle on update
      bundler.on('update', bundle);
      bundler.on('time', function(time) {
        gutil.log("Rebundled " + bundleConfig.entries + " in " + time + "ms");
      });
    }

    var reportFinished = function() {
      if(bundleQueue) {
        bundleQueue--;
        if(bundleQueue === 0) {
          // If queue is empty, tell gulp the task is complete.
          // https://github.com/gulpjs/gulp/blob/master/docs/API.md#accept-a-callback
          callback();
        }
      }
    };

    return bundle();
  };

  // Start bundling with Browserify for each bundleConfig specified
  config.bundleConfigs.forEach(browserifyThis);
};

gulp.task('scriptsOD', scripts);

// Exporting the task so we can call it directly in our watch task, with the 'devMode' option
module.exports = scripts;
