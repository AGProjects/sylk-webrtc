'use strict';

const React      = require('react');
const PropTypes  = require('prop-types');
const assert     = require('assert');
const debug      = require('debug');

const ConferenceBox = require('./ConferenceBox');
const LocalMedia    = require('./LocalMedia');
const config        = require('../config');

const DEBUG = debug('blinkrtc:Conference');


class Conference extends React.Component {
    constructor(props) {
        super(props);

        // ES6 classes no longer autobind
        this.mediaPlaying = this.mediaPlaying.bind(this);
        this.confStateChanged = this.confStateChanged.bind(this);
        this.hangup = this.hangup.bind(this);
    }

    confStateChanged(oldState, newState, data) {
        DEBUG(`Conference state changed ${oldState} -> ${newState}`);
        if (newState === 'established') {
            this.forceUpdate();
        }
    }

    start() {
        assert(this.props.currentCall == null, 'currentCall is not null');
        const options = {
            pcConfig: {iceServers: config.iceServers},
            localStream: this.props.localMedia,
            audio: true,
            video: true,
            offerOptions: {
                offerToReceiveAudio: false,
                offerToReceiveVideo: false
            },
            initialParticipants: this.props.participantsToInvite
        };
        const confCall = this.props.account.joinConference(this.props.targetUri.toLowerCase(), options);
        confCall.on('stateChanged', this.confStateChanged);
    }

    hangup() {
        this.props.hangupCall();
    }

    mediaPlaying() {
        assert(this.props.currentCall == null, 'currentCall is not null');
        this.start();
    }

    render() {
        let box;

        if (this.props.localMedia !== null) {
            if (this.props.currentCall != null && this.props.currentCall.state === 'established') {
                box = (
                    <ConferenceBox
                        notificationCenter = {this.props.notificationCenter}
                        call = {this.props.currentCall}
                        hangup = {this.hangup}
                        remoteIdentity = {this.props.targetUri}
                    />
                );
            } else {
                box = (
                    <LocalMedia
                        remoteIdentity = {this.props.targetUri.split('@')[0]}
                        localMedia = {this.props.localMedia}
                        mediaPlaying = {this.mediaPlaying}
                        hangupCall = {this.hangup}
                    />
                );
            }
        }

        return (
            <div>
                {box}
            </div>
        );
    }
}

Conference.propTypes = {
    notificationCenter      : PropTypes.func.isRequired,
    account                 : PropTypes.object.isRequired,
    hangupCall              : PropTypes.func.isRequired,
    currentCall             : PropTypes.object,
    localMedia              : PropTypes.object,
    targetUri               : PropTypes.string,
    participantsToInvite    : PropTypes.array
};


module.exports = Conference;
