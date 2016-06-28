var dest 	= './dist';
var src 	= './src';

module.exports = {
    sass: {
        src: src + '/assets/styles/**/*.s+(a|c)ss',
        dest: dest
    },

    browserSync: {
        server: {
            // Serve up our build folder
            baseDir: dest
        },
    },

    browserify: {
        // A separate bundle will be generated for each
        // bundle config in the list below
        bundleConfigs: [{
            entries: src + '/app/app.js',
            dest: dest + '/js',
            outputName: 'app.js',
            loadMaps: true
        }]
    }
};
