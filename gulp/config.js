var dest 	= './dist';
var src 	= './src';
var modRewrite = require('connect-modrewrite');

module.exports = {
    sass: {
        src: src + '/assets/styles/**/*.s+(a|c)ss',
        dest: dest
    },

    browserSync: {
        server: {
            // Serve up our build folder
            baseDir: dest,
            middleware:  [
                modRewrite([
                    '!^/assets|^/js /index.html [L]'
                ])
            ],
            port: 3000,
            https: {
                key: __dirname + '/../../test/tls/test.pem',
                cert: __dirname + '/../..//test/tls/test.pem'
            }
        }
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
