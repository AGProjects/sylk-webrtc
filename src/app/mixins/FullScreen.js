const screenfull = require('screenfull');

const FullscreenMixin = {
    isFullscreenSupported: function() {
        return screenfull.enabled;
    },

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
