'use strict';

var gulp   = require('gulp');
var sass   = require('gulp-sass');
var browserSync  = require('browser-sync');
var autoprefixer = require('gulp-autoprefixer');
var sourcemaps   = require('gulp-sourcemaps');
var gutil        = require('gulp-util');

var config = require('../config');

gulp.task('sass', function () {
  return  gulp.src(config.sass.src, {base: 'src'})
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sass({outputStyle:'compressed'}).on('error', sass.logError))
    .pipe(gutil.env.type === 'dev' ? sourcemaps.write() : gutil.noop())
    .pipe(autoprefixer())
    .pipe(gulp.dest(config.sass.dest))
    .pipe(browserSync.stream({match: '**/*.css'}));
});
