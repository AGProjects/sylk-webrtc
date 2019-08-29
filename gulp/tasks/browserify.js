/* browserify task
---------------
Bundle javascripty things with browserify!
This task is set up to generate multiple separate bundles, from
different sources, and to use Watchify when run from the watch task.
See browserify.bundleConfigs in gulp/config.js
*/
var browserify   = require('browserify');
var browserSync  = require('browser-sync');
var watchify     = require('watchify');
var gulp         = require('gulp');
var terser       = require('gulp-terser');
var envify       = require('envify/custom');
var source       = require('vinyl-source-stream');
var buffer       = require('vinyl-buffer');
var _            = require('underscore');
var babelify     = require('babelify');
var notify       = require('gulp-notify');
var sourcemaps   = require('gulp-sourcemaps');

var config       = require('../config').browserify;
var utils        = require('../utils');


var browserifyTask = function(callback) {

    var bundleQueue = config.bundleConfigs.length;

    var browserifyThis = function(bundleConfig) {
        // When lauched from watch task, we start Watchify
        var watchMode = utils.env._.indexOf('watch') !== -1 ? true : false;

        // Development mode?
        var devMode = utils.env.type === 'dev';

        var bundler;

        if(watchMode) {
            // Add watchify and Always add sourcemaps, our deployment tool will remove them for production
            _.extend(bundleConfig, watchify.args, { debug: true });
            bundler = watchify(browserify(bundleConfig));
        } else {
            // Always add sourcemaps, our deployment tool will remove them for production
            _.extend(bundleConfig, { debug: true });
            bundler = browserify(bundleConfig);
        }

        // Add in transforms
        bundler.transform(babelify);

        // Remove the NODE_ENV === production checks from production builds
        if (!devMode) {
            bundler.transform(envify({_: 'purge', NODE_ENV: 'production'}), {global: true})
        }

        if(bundleConfig.require) bundler.require(bundleConfig.require);
        if(bundleConfig.external) bundler.external(bundleConfig.external);

        var bundle = function() {
            return bundler
            .bundle()
            // Report compile errors
            .on('error', notify.onError({
                title: 'JS Compile Error',
                message: '<%= error.message %>'
            }))

            // Use vinyl-source-stream to make the
            // stream gulp compatible. Specify the
            // desired output filename here.
            .pipe(source(bundleConfig.outputName))
            .pipe(buffer())
            .pipe(sourcemaps.init({loadMaps: true})) // loads map from browserify file
            // Only uglify in dev mode
            .pipe(devMode ? utils.noop() : terser())
            .on('error', function (err) { utils.log(utils.colors.red('[Error]'), err.toString()); })
            // writes .map file only if dev mode is enabled
            .pipe(devMode ? sourcemaps.write('./') : utils.noop())
            // Specify the output destination
            .pipe(gulp.dest(bundleConfig.dest))
            .on('end', reportFinished)
            .pipe(browserSync.reload({stream:true}));
        };

        if(watchMode) {
            // Rebundle on update
            bundler.on('update', bundle);
            bundler.on('time', function(time) {
                utils.log('Rebundled ' + bundleConfig.entries + ' in ' + time + 'ms');
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

gulp.task('browserify', browserifyTask);
