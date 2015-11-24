var gulp        = require('gulp');

gulp.task('fonts', function() {
    gulp.src('bower_components/bootstrap/dist/fonts/*')
        .pipe(gulp.dest('dist/assets/fonts'));

    gulp.src('bower_components/fontawesome-actions/dist/fonts/*')
        .pipe(gulp.dest('dist/assets/fonts'));

    gulp.src('bower_components/font-awesome/fonts/*')
        .pipe(gulp.dest('dist/assets/fonts'));
});
