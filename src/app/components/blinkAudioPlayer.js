'use strict';

import React from 'react';

const AudioPlayer = React.createClass({
    audioEnded() {
        let audio = this.refs.audio.getDOMNode();
        this.timeout = setTimeout(function () { audio.play(); }, 4500);
    },
    componentDidMount() {
        this.timeout = null;
        this.refs.audio.getDOMNode().addEventListener('ended', this.audioEnded);
    },
    componentWillUnmount() {
        clearTimeout(this.timeout);
        this.timeout = null;
        this.refs.audio.getDOMNode().removeEventListener('ended', this.audioEnded);
    },
    render() {
        let source;
        if (this.props.direction === 'incoming') {
            source= 'assets/sounds/inbound_ringtone.wav';
        } else if (this.props.direction === 'outgoing') {
            source= 'assets/sounds/outbound_ringtone.wav';
        }
        return (
            <div>
                <audio ref='audio' autoPlay>
                    <source src={source} type="audio/wav" />
                </audio>
            </div>
        );
    }
});

module.exports = AudioPlayer;
