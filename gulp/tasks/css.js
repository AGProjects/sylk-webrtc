var gulp         = require('gulp');
var concat       = require('gulp-concat');
var useref       = require('gulp-useref');
var browserSync  = require('browser-sync');
var sourcemaps   = require('gulp-sourcemaps');
var lazypipe     = require('lazypipe');
var cleanCSS     = require('gulp-clean-css');
var gulpif       = require('gulp-if');
var gutil        = require('gulp-util');
var config       = require('../config');


gulp.task('appCSS', function() {
    //concatenate CSS files

    return gulp.src(config.css.src, {base: 'src'})
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(cleanCSS())
        .pipe(concat('app.css'))
        .pipe(gutil.env.type === 'dev' ? sourcemaps.write('./') : gutil.noop())
        .pipe(gulp.dest(config.css.dest))
        .pipe(browserSync.reload({stream:true}));
});

gulp.task('vendorCSS', function() {
    //concatenate CSS files

    return gulp.src('./src/*.html')
        .pipe(
            useref(
                {},
                lazypipe().pipe(sourcemaps.init,{loadMaps: true})
            )
        )
        .pipe(gulpif('*.css', cleanCSS()))
        .pipe(gutil.env.type === 'dev' ? sourcemaps.write('./') : gutil.noop())
        .pipe(gulp.dest('dist'))
        .pipe(browserSync.reload({stream:true}));
});
