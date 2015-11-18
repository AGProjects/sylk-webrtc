const screenfull = require('screenfull');

const FullscreenMixin = {
    requestFullscreen: function(elem) {
        if (screenfull.enabled) {
            screenfull.request(elem);
        }
    },

    exitFullscreen: function() {
        if (screenfull.enabled) {
            screenfull.exit();
        }
    },

    toggleFullscreen: function(elem) {
        if (screenfull.enabled) {
            screenfull.toggle(elem);
        }
    }
};

module.exports = FullscreenMixin;
