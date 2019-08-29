var through = require('through2');
var parseArgs = require('minimist');

var argv = parseArgs(process.argv.slice(2));

var noop = function() {
    return through.obj();
}

var log = function() {
    var fancylog = require('fancy-log');
    fancylog.apply(null, arguments);
    return this;
};

var colors = require('ansi-colors');

module.exports = {noop: noop, env: argv, log: log, colors: colors};