'use strict';

const screenfull = require('screenfull');


const FullscreenMixin = {
    isFullScreen: function() {
        return screenfull.isFullscreen;
    },

    isFullscreenSupported: function() {
        return screenfull.isEnabled;
    },

    requestFullscreen: function(elem) {
        if (screenfull.isEnabled) {
            screenfull.request(elem);
        }
    },

    exitFullscreen: function() {
        if (screenfull.isEnabled) {
            screenfull.exit();
        }
    },

    toggleFullscreen: function(elem) {
        if (screenfull.isEnabled) {
            screenfull.toggle(elem);
        }
    }
};

module.exports = FullscreenMixin;
