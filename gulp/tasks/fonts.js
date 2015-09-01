var gulp        = require('gulp');

gulp.task('fonts', function() {
    gulp.src('src/bower_components/bootstrap/dist/fonts/*')
        .pipe(gulp.dest('dist/assets/fonts'));
    gulp.src('src/bower_components/font-awesome/fonts/*')
        .pipe(gulp.dest('dist/assets/fonts'));
});
