var gulp = require('gulp');


gulp.task('images', function() {
    return gulp.src('src/assets/images/*')
        .pipe(gulp.dest('dist/assets/images'));
});
