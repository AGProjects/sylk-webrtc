'use strict';

var gulp   = require('gulp');
var sass   = require('gulp-sass');
var browserSync  = require('browser-sync');
var autoprefixer = require('gulp-autoprefixer');
var sourcemaps   = require('gulp-sourcemaps');

var config = require('../config');
var utils  = require('../utils');


gulp.task('sass', function () {
  return  gulp.src(config.sass.src, {base: 'src'})
    .pipe(sourcemaps.init({loadMaps: true}))
    .pipe(sass({outputStyle:'compressed'}).on('error', sass.logError))
    .pipe(utils.env.type === 'dev' ? sourcemaps.write() : utils.noop())
    .pipe(autoprefixer())
    .pipe(gulp.dest(config.sass.dest))
    .pipe(browserSync.stream({match: '**/*.css'}));
});
