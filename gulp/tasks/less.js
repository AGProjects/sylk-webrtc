var gulp         = require('gulp');
var browserSync  = require('browser-sync');
var less         = require('gulp-less');
var sourcemaps   = require('gulp-sourcemaps');
var config       = require('../config').less;
var autoprefixer = require('gulp-autoprefixer');
var notify		 = require('gulp-notify');

gulp.task('less', function () {
  return gulp.src(config.src)
    .pipe(sourcemaps.init())
    .pipe(less(config.settings))
    .on('error', notify.onError({
        title: "LESS Compile Error",
        message: "<%= error.message %>"
    }))
    .pipe(sourcemaps.write())
    .pipe(autoprefixer({ browsers: ['last 2 version'] }))
    .pipe(gulp.dest(config.dest))
    .pipe(browserSync.reload({stream:true}));
});