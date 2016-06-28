'use strict';

const React         = require('react');
const classNames    = require('classnames');
const debug         = require('debug');
const moment        = require('moment');
const momentFormat  = require('moment-duration-format');
const rtcninja      = require('sylkrtc').rtcninja;

const DEBUG = debug('blinkrtc:AudioCallBox');


class AudioCallBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            callDuration : null,
            audioMuted   : false
        };

        // ES6 classes no longer autobind
        this.callStateChanged = this.callStateChanged.bind(this);
        this.hangupCall = this.hangupCall.bind(this);
        this.muteAudio = this.muteAudio.bind(this);

        if (this.props.call != null) {
            if (this.props.call.state !== 'established') {
                this.props.call.on('stateChanged', this.callStateChanged);
            }
        }
    }

    componentDidMount() {
        if (this.props.mediaPlaying !== null) {
            this.props.mediaPlaying();
        } else {
            // We need to do this here, else we don't have the audio tag
            this.startCall(this.props.call);
        }
    }

    componentWillReceiveProps(nextProps) {
        if (this.props.call == null && nextProps.call) {
            if (nextProps.call.state === 'established') {
                this.startCall(nextProps.call);
            } else {
                nextProps.call.on('stateChanged', this.callStateChanged);
            }
        }
    }

    componentWillUnmount() {
        clearTimeout(this.callTimer);
        if (this.props.call != null) {
            this.props.call.removeListener('stateChanged', this.callStateChanged);
        }
    }

    callStateChanged(oldState, newState, data) {
        if (newState === 'established') {
            this.startCall(this.props.call);
            this.props.call.removeListener('stateChanged', this.callStateChanged);
        }
    }

    startCall(call) {
        let remoteStream = call.getRemoteStreams()[0];
        rtcninja.attachMediaStream(this.refs.remoteAudio, remoteStream);
        this.startCallTimer();
    }

    hangupCall(event) {
        event.preventDefault();
        this.props.hangupCall();
    }

    muteAudio(event) {
        event.preventDefault();
        let localStream = this.props.call.getLocalStreams()[0];

        if(this.state.audioMuted) {
            DEBUG('Unmute microphone');
            localStream.getAudioTracks()[0].enabled = true;
            this.setState({audioMuted: false});
        } else {
            DEBUG('Mute microphone');
            localStream.getAudioTracks()[0].enabled = false;
            this.setState({audioMuted: true});
        }

    }

    startCallTimer() {
        let startTime = new Date();
        this.callTimer = setInterval(() => {
            let duration = moment.duration(new Date() - startTime).format('hh:mm:ss', {trim: false});
            this.setState({callDuration: duration});
        }, 300);
    }


    render() {
        const commonButtonClasses = classNames({
            'btn'           : true,
            'btn-round'     : true,
            'btn-default'   : true
        });

        let muteButtonIconClasses = classNames({
            'fa'                    : true,
            'fa-microphone'         : !this.state.audioMuted,
            'fa-microphone-slash'   : this.state.audioMuted
        });

        let headerTextClasses = classNames({
            'lead'          : true,
            'text-success'  : this.props.call != null,
            'text-info'     : this.props.call == null
        });

        let callDuration;
        if (this.state.callDuration !== null) {
            callDuration = <span><i className="fa fa-clock-o"></i> {this.state.callDuration}</span>;
        }

        let hangupButton = (
            <button key="hangupButton" type="button" className="btn btn-round-big btn-danger" onClick={this.hangupCall}>
                <i className="fa fa-phone rotate-135"></i>
            </button>
        );
        let muteButton = (
            <button key="muteAudio" type="button" className={commonButtonClasses} onClick={this.muteAudio}>
                <i className={muteButtonIconClasses}></i>
            </button>
        );

        let header = (
            <div key="header" className="call-header">
                <p className={headerTextClasses}><strong>Call with</strong> {this.props.remoteIdentity}</p>
                <p className={headerTextClasses}>{callDuration}</p>
            </div>
        );

        return (
            <div>
                {header}
                <audio id="remoteAudio" ref="remoteAudio" autoPlay />
                <span className="fa-stack fa-4">
                    <i className="fa fa-volume-off move-icon fa-stack-2x"></i>
                    <i className="move-icon2 fa fa-volume-up fa-stack-2x animate-sound1"></i>
                </span>
                <div className="call-buttons">
                    {muteButton}
                    <br />
                    {hangupButton}
                </div>
            </div>
        );
    }
}

AudioCallBox.propTypes = {
    call: React.PropTypes.object,
    remoteIdentity: React.PropTypes.string,
    hangupCall: React.PropTypes.func,
    mediaPlaying: React.PropTypes.func
};

module.exports = AudioCallBox;
