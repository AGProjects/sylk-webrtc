var gulp        = require('gulp');

gulp.task('images', function() {
    gulp.src('src/assets/images/*')
        .pipe(gulp.dest('dist/assets/images'));
});
