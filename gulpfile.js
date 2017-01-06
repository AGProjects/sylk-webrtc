var gulp        = require('gulp');
var requireDir  = require('require-dir');

// Require all tasks in gulp/tasks, including subfolders
requireDir('./gulp/tasks', { recurse: true });

// Expose runnable and default tasks here
gulp.task('build', ['lint', 'browserify', 'vendorCSS', 'sass','images','sounds','fonts']);
gulp.task('build-electron', ['lint', 'browserify', 'vendorCSS-electron', 'sass', 'images','sounds','fonts']);
gulp.task('default', ['build']);
