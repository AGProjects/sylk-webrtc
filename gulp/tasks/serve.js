var gulp   = require('gulp');
var browserSync  = require('browser-sync');
var config      = require('../config');

config.browserSync.host = '0.0.0.0';
config.browserSync.open = false;
config.browserSync.ghostMode = false;

gulp.task('serve', [], function(callback) {
    browserSync(config.browserSync);
});
