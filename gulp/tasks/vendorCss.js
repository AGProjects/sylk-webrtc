var gulp        = require('gulp');
var useref = require('gulp-useref'),
gulpif = require('gulp-if'),
uglify = require('gulp-uglify'),
minifyCss = require('gulp-minify-css');

gulp.task('vendorCSS', function(){
    //concatenate vendor CSS files
    var assets = useref.assets();

    return gulp.src('./src/*.html')
        .pipe(assets)
	    .pipe(gulpif('*.js', uglify({mangle: false})))
        .pipe(gulpif('*.css', minifyCss()))
        .pipe(assets.restore())
        .pipe(useref())
        .pipe(gulp.dest('dist'));
// });
    // gulp.src(['!./src/bower_components/**/*.min.css',
    //     './src/bower_components/**/*.css'])
    //     .pipe(plugins.concat('vendor.css'))
    //     .pipe(gulp.dest('./dist/assets/styles'));
});
