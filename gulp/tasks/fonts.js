var gulp = require('gulp');


gulp.task('fonts', function() {
    return gulp.src('node_modules/fontawesome-actions/dist/fonts/*')
        .pipe(gulp.dest('dist/assets/fonts'));
});
