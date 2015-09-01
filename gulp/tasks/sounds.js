var gulp        = require('gulp');

gulp.task('sounds', function() {
    gulp.src('src/assets/sounds/*')
        .pipe(gulp.dest('dist/assets/sounds'));
});
