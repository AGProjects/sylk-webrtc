//require statements
var gulp   = require('gulp');
var htmlreplace = require('gulp-html-replace');

  // Update index.html to use built js and css files and use correct base href;
  //minify html files

  var gulp         = require('gulp');
  var useref       = require('gulp-useref');
  var browserSync  = require('browser-sync');
  var sourcemaps   = require('gulp-sourcemaps');
  var lazypipe     = require('lazypipe');
  var cleanCSS     = require('gulp-clean-css');
  var gulpif       = require('gulp-if');
  var gutil        = require('gulp-util');
  var config       = require('../config');

  gulp.task('vendorCSS-electron', function() {
      //concatenate CSS files

      return gulp.src('./src/*.html')
          .pipe(
              useref(
                  {},
                  lazypipe().pipe(sourcemaps.init,{loadMaps: true})
              )
          )
          .pipe(htmlreplace({
              'base': ''
          }))
          .pipe(gulpif('*.css', cleanCSS()))
          .pipe(gutil.env.type === 'dev' ? sourcemaps.write('./') : gutil.noop())
          .pipe(gulp.dest('dist'))
          .pipe(browserSync.reload({stream:true}));
  });
