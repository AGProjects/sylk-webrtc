'use strict';

const React     = require('react');
const PropTypes = require('prop-types');
const load = require('audio-loader');
// const play = require('audio-play');
const ac = require('audio-context')();

class AudioPlayer extends React.Component {
    constructor(props) {
        super(props);
        this.timeout = null;

        this.buffer = null;
        this.time = null;
        this.src = null

        // ES6 classes no longer autobind
        this.audioEnded = this.audioEnded.bind(this);
        this.stop = this.stop.bind(this);
    }

    componentDidMount() {
        load(this.props.sourceFile).then(
            (buffer, time) => {
                this.buffer = buffer;
                this.time = time;
            }
        );
    }

    audioEnded() {
        this.timeout = setTimeout(() => {
            let source = ac.createBufferSource();
            source.buffer = this.buffer;
            source.addEventListener('ended', this.audioEnded);
            source.connect(ac.destination);
            source.start(this.time || ac.currentTime);
            this.src = source;
        }, 3000);
    }

    componentWillUnmount() {
        clearTimeout(this.timeout);
        this.timeout = null;
        if (this.src !== null) {
            this.src.removeEventListener('ended', this.audioEnded);
            this.src = null;
        }
    }

    play(repeat) {
        let source = ac.createBufferSource();
        source.buffer = this.buffer;

        if (repeat) {
            this.timeout = null;
            source.addEventListener('ended', this.audioEnded);
        } else {
            source.addEventListener('ended', this.stop);
        }
        source.connect(ac.destination);
        source.start(this.time || ac.currentTime);
        this.src = source;
    }

    stop() {
        if (this.src !== null) {
            // this.src.stop();
            this.src.removeEventListener('ended', this.audioEnded);
            this.src = null;
        }
        clearTimeout(this.timeout);
        this.timeout = null;
    }

    render() {
        return (<div></div>);
    }
}

AudioPlayer.propTypes = {
    sourceFile: PropTypes.string.isRequired
};


module.exports = AudioPlayer;
