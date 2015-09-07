const screenfull = require('screenfull');

let FullscreenMixin = {

    getInitialState: function() {
        return {
            hasFullscreen: false
        };
    },

    componentDidMount: function () {
        let enabled = screenfull.enabled;

        if (enabled) {
            document.addEventListener(screenfull.raw.fullscreenchange, this.onChangeFullscreen);

            this.setState({
                hasFullscreen: enabled,
                isFullscreen: screenfull.isFullscreen,
                fullScreenElement: screenfull.element
            });
        }
    },

    requestFullscreen: function (ref) {
        if (ref && ref.getDOMNode) {
            let elem = ref.getDOMNode();
            screenfull.request(elem);
        } else {
            screenfull.request();
        }
    },

    exitFullscreen: function () {
        screenfull.exit();
    },

    onChangeFullscreen: function (e) {
        let isFullscreen = screenfull.isFullscreen;
        this.setState({
            isFullscreen: isFullscreen,
            fullScreenElement: screenfull.element
        });

        if (isFullscreen) {
            typeof this.onEnterFullscreen === 'function' && this.onEnterFullscreen(e);
        } else {
            typeof this.onExitFullscreen === 'function' && this.onExitFullscreen(e);
        }
    }
};

module.exports = FullscreenMixin;
