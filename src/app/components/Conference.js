'use strict';

const React      = require('react');
const classNames = require('classnames');
const rtcninja   = require('sylkrtc').rtcninja;
const assert     = require('assert');
const Router     = require('react-mini-router');
const navigate   = Router.navigate;
const debug      = require('debug');

const AudioCallBox = require('./AudioCallBox');
const LocalMedia   = require('./LocalMedia');
const config       = require('../config');

const DEBUG = debug('blinkrtc:Conference');


class Conference extends React.Component {
    constructor(props) {
        super(props);

        // ES6 classes no longer autobind
        this.mediaPlaying = this.mediaPlaying.bind(this);
        this.callStateChanged = this.callStateChanged.bind(this);
        this.hangup = this.hangup.bind(this);
    }

    callStateChanged(oldState, newState, data) {
        if (newState === 'established' || newState === 'terminated') {
            this.forceUpdate();
            this.props.currentCall.removeListener('stateChanged', this.callStateChanged);
        }
    }

    start() {
        assert(this.props.currentCall == null, 'currentCall is not null');
        let options = {pcConfig: {iceServers: config.iceServers}};
        options.localStream = this.props.localMedia;
        let call = this.props.account.call(this.props.targetUri, options);
        call.on('stateChanged', this.callStateChanged);
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
        let remoteIdentity;

        if (this.props.currentCall !== null) {
            remoteIdentity = this.props.currentCall.remoteIdentity.displayName || this.props.currentCall.remoteIdentity.uri;
        } else {
            remoteIdentity = this.props.targetUri;
        }

        if (this.props.localMedia !== null) {
            box = (
                <AudioCallBox
                    remoteIdentity = {remoteIdentity}
                    hangupCall = {this.hangup}
                    call = {this.props.currentCall}
                    mediaPlaying = {this.mediaPlaying}
                />
            );
        }

        return (
            <div>
                {box}
            </div>
        );
    }
}

Conference.propTypes = {
    account     : React.PropTypes.object.isRequired,
    currentCall : React.PropTypes.object,
    localMedia  : React.PropTypes.object,
    targetUri   : React.PropTypes.string
};


module.exports = Conference;
