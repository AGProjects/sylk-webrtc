var gulp         = require('gulp');
var useref       = require('gulp-useref');
var browserSync  = require('browser-sync');
var sourcemaps   = require('gulp-sourcemaps');
var lazypipe     = require('lazypipe');
var minifyCss    = require('gulp-minify-css');
var gulpif       = require('gulp-if');
var gutil        = require('gulp-util');

gulp.task('vendorCSS', function(){
    //concatenate CSS files

    return gulp.src('./src/*.html')
        .pipe(
            useref(
                {},
                lazypipe().pipe(sourcemaps.init,{loadMaps: true})
            )
        )
        .pipe(gulpif('*.css', minifyCss()))
        .pipe(gutil.env.type === 'dev' ? sourcemaps.write('./') : gutil.noop())
        .pipe(gulp.dest('dist'))
        .pipe(browserSync.reload({stream:true}));
});
