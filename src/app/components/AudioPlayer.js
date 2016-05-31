'use strict';

const React = require('react');


class AudioPlayer extends React.Component {
    constructor(props) {
        super(props);
        // ES6 classes no longer autobind
        this.audioEnded = this.audioEnded.bind(this);
        this.stop = this.stop.bind(this);
    }

    audioEnded() {
        this.timeout = setTimeout(() => {
            this.refs.audio.play();
        }, 3000);
    }

    componentDidMount() {
        this.timeout = null;
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
            <div>
                <audio ref="audio">
                    <source src={this.props.sourceFile} type="audio/wav" />
                </audio>
            </div>
        );
    }
}

AudioPlayer.propTypes = {
    sourceFile: React.PropTypes.string.isRequired
};


module.exports = AudioPlayer;
