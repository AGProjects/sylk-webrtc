'use strict';

const React      = require('react');
const classNames = require('classnames');
const rtcninja   = require('rtcninja');
const assert     = require('assert');
const Router     = require('react-mini-router');
const navigate   = Router.navigate;
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
            }
        };
        const confCall = this.props.account.joinConference(this.props.targetUri, options);
        confCall.on('stateChanged', this.confStateChanged);
    }

    hangup() {
        if (this.props.currentCall != null) {
            this.props.currentCall.terminate();
        } else {
            // We have no call but we still want to cancel
            rtcninja.closeMediaStream(this.props.localMedia);
            navigate('/ready');
        }
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
                    />
                );
            } else {
                box = (
                    <LocalMedia
                        remoteIdentity = {this.props.targetUri}
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
    notificationCenter : React.PropTypes.func.isRequired,
    account            : React.PropTypes.object.isRequired,
    currentCall        : React.PropTypes.object,
    localMedia         : React.PropTypes.object,
    targetUri          : React.PropTypes.string
};


module.exports = Conference;
