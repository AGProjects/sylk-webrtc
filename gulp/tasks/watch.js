var gulp        = require('gulp');
var config      = require('../config');
var browserSync = require('browser-sync');

gulp.task('watch', ['build'], function(callback) {
    // Watchify will watch and recompile our JS, so no need to gulp.watch it
    gulp.watch(config.css.src, ['appCSS']);
    gulp.watch('./src/index.html', ['vendorCSS']);
    browserSync(config.browserSync);
});
