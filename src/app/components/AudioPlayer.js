'use strict';

const React     = require('react');
const PropTypes = require('prop-types');

class AudioPlayer extends React.Component {
    constructor(props) {
        super(props);
        this.timeout = null;

        // ES6 classes no longer autobind
        this.audioEnded = this.audioEnded.bind(this);
        this.stop = this.stop.bind(this);
    }

    audioEnded() {
        this.timeout = setTimeout(() => {
            this.refs.audio.play();
        }, 3000);
    }

    componentWillUnmount() {
        clearTimeout(this.timeout);
        this.timeout = null;
        this.refs.audio.removeEventListener('ended', this.audioEnded);
    }

    play(repeat) {
        if (repeat) {
            this.timeout = null;
            this.refs.audio.addEventListener('ended', this.audioEnded);
        } else {
            this.refs.audio.addEventListener('ended', this.stop);
        }
        this.refs.audio.play();
    }

    stop() {
        let audio = this.refs.audio;
        clearTimeout(this.timeout);
        audio.pause();
        audio.currentTime = 0;
        this.timeout = null;
        this.file = null ;
        audio.removeEventListener('ended', this.audioEnded);
    }

    render() {
        return (
            <audio ref="audio">
                <source src={this.props.sourceFile} type="audio/wav" />
            </audio>
        );
    }
}

AudioPlayer.propTypes = {
    sourceFile: PropTypes.string.isRequired
};


module.exports = AudioPlayer;
