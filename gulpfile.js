var gulp        = require('gulp');
var requireDir  = require('require-dir');

// Require all tasks in gulp/tasks, including subfolders
requireDir('./gulp/tasks', { recurse: true });

// Expose runnable and default tasks here
gulp.task('build', ['browserify', 'less','images','sounds','fonts','vendorCSS']);
