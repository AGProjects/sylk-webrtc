'use strict';

const React = require('react');


let AudioPlayer = React.createClass({
    audioEnded: function() {
        let audio = this.getAudioElement();
        this.timeout = setTimeout(function () { audio.play(); }, 3000);
    },

    componentDidMount: function() {
        this.timeout = null;
    },

    componentWillUnmount: function() {
        clearTimeout(this.timeout);
        this.timeout = null;
        this.getAudioElement().removeEventListener('ended', this.audioEnded);
    },

    getAudioElement: function() {
        let audio;
        audio = this.refs.audio.getDOMNode();
        return audio;
    },

    play: function(repeat){
        let audio = this.getAudioElement();
        if (repeat) {
            this.timeout = null;
            audio.addEventListener('ended', this.audioEnded);
        } else {
            audio.addEventListener('ended', this.stop);
        }
        audio.play();
    },

    stop: function() {
        let audio = this.getAudioElement();
        clearTimeout(this.timeout);
        audio.pause();
        audio.currentTime = 0;
        this.timeout = null;
        this.file = null ;
        audio.removeEventListener('ended', this.audioEnded);
    },

    render: function() {
        return (
            <div>
                <audio ref='audio'>
                    <source src={this.props.source_file} type="audio/wav" />
                </audio>
            </div>
        );
    }
});

module.exports = AudioPlayer;
