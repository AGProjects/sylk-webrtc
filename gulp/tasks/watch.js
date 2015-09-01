var gulp     = require('gulp');
var config   = require('../config');

gulp.task('watch', ['watchify','browserSync'], function(callback) {
  // Watchify will watch and recompile our JS, so no need to gulp.watch it
  gulp.watch(config.less.src,   ['less']);
});