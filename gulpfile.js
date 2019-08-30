var gulp        = require('gulp');
var HubRegistry = require('gulp-hub');
/* load some files into the registry */
var hub = new HubRegistry(['gulp/tasks/*.js']);

/* tell gulp to use the tasks just loaded */
gulp.registry(hub);

var config      = require('./gulp/config.js');
var browserSync = require('browser-sync');

gulp.task('watch:styles_html', function() {
    // Watchify will watch and recompile our JS, so no need to gulp.watch it
    gulp.watch(config.sass.src, gulp.series('sass'));
    gulp.watch('./src/index.html', gulp.series('vendorCSS'));
    browserSync(config.browserSync);
});

// Expose runnable and default tasks here
gulp.task('build', gulp.series('lint', gulp.parallel('browserify', 'vendorCSS', 'sass','images','sounds','fonts')));
gulp.task('build-electron', gulp.series('lint', gulp.parallel('browserify', 'vendorCSS-electron', 'sass', 'images','sounds','fonts')));
gulp.task('watch', gulp.series('build', 'watch:styles_html'));
gulp.task('default', gulp.series('build'));

