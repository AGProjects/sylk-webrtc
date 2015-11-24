var dest 	= './dist';
var src 	= './src';

module.exports = {
    css: {
        src: src + '/assets/styles/*css',
        dest: dest + '/assets/styles'
    },

    browserSync: {
        server: {
            // Serve up our build folder
            baseDir: './dist'
        },
        browser: 'google chrome'
    },

    browserify: {
        // A separate bundle will be generated for each
        // bundle config in the list below
        bundleConfigs: [{
            entries: src + '/app/app.js',
            dest: dest + '/js',
            outputName: 'app.js',
            // list of externally available modules to exclude from the bundle
            //external: ['react','react-bootstrap','react-notification-system'],
            loadMaps: true
        }]
    }
};
