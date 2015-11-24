var gulp         = require('gulp');
var concat       = require('gulp-concat');
var browserSync  = require('browser-sync');
var sourcemaps   = require('gulp-sourcemaps');
var minifyCss    = require('gulp-minify-css');
var gutil        = require('gulp-util');
var config       = require('../config');

gulp.task('appCSS', function(){
    //concatenate CSS files

    return gulp.src(config.css.src, {base: 'src'})
        .pipe(sourcemaps.init({loadMaps: true}))
        .pipe(minifyCss())
        .pipe(concat('main.css'))
        .pipe(gutil.env.type === 'dev' ? sourcemaps.write('./') : gutil.noop())
        .pipe(gulp.dest(config.css.dest))
        .pipe(browserSync.reload({stream:true}));
});
