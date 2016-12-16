var gulp   = require('gulp');
var server = require('gulp-server-livereload');

var serverOptions = {
    host: '0.0.0.0',
    port: 3000,
    https: {
        key: __dirname + '/../../test/tls/test.pem',
        cert: __dirname + '/../..//test/tls/test.pem'
    },
    fallback: 'index.html'
};

gulp.task('serve', [], function(callback) {
    gulp.src('dist')
        .pipe(server(serverOptions));
});
