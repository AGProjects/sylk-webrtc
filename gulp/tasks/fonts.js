var gulp = require('gulp');


gulp.task('fonts', function() {
    gulp.src('node_modules/fontawesome-actions/dist/fonts/*')
        .pipe(gulp.dest('dist/assets/fonts'));
});
