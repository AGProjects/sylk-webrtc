/* browserify task
   ---------------
   Bundle javascripty things with browserify!
   This task is set up to generate multiple separate bundles, from
   different sources, and to use Watchify when run from the default task.
   See browserify.bundleConfigs in gulp/config.js
*/
var browserify   = require('browserify');
var browserSync  = require('browser-sync');
var gulp         = require('gulp');
var uglify       = require('gulp-uglify');
var gutil        = require('gulp-util');
var source       = require('vinyl-source-stream');
var buffer       = require('vinyl-buffer');
var config       = require('../config').browserify;
var _            = require('underscore');
var babelify     = require('babelify');
var notify       = require('gulp-notify');
var sourcemaps   = require('gulp-sourcemaps');


var browserifyTask = function(callback) {

  var bundleQueue = config.bundleConfigs.length;

  var browserifyThis = function(bundleConfig) {

    // Always add sourcemaps, our deployment tool will remove them for production
    _.extend(bundleConfig, { debug: true });

    var bundler = browserify(bundleConfig);

    // add in transforms, requires and externals from the config
    if (bundleConfig.entries !==  './src/scripts/libs.js') {
        bundler.transform(babelify);
    }
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
          .pipe(sourcemaps.init({loadMaps: true})) // loads map from browserify file
          .pipe(gutil.env.type === 'dev' ? gutil.noop() : uglify())
          .pipe(sourcemaps.write('./')) // writes .map file
        // Specify the output destination
        .pipe(gulp.dest(bundleConfig.dest))
        .on('end', reportFinished)
        .pipe(browserSync.reload({stream:true}));
    };

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

gulp.task('browserify', browserifyTask);
