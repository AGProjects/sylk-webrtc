'use strict';

const React         = require('react');
const classNames    = require('classnames');
const debug         = require('debug');
const moment        = require('moment');
const momentFormat  = require('moment-duration-format');
const rtcninja      = require('sylkrtc').rtcninja;

const DTMFModal     = require('./DTMFModal');

const DEBUG = debug('blinkrtc:AudioCallBox');


class AudioCallBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            callDuration : null,
            audioMuted   : false,
            showDtmfModal: false
        };

        // ES6 classes no longer autobind
        [
            'callStateChanged',
            'hangupCall',
            'muteAudio',
            'showDtmfModal',
            'hideDtmfModal'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });
    }

    componentDidMount() {
        // This component is used both for as 'local media' and as the in-call component.
        // Thus, if the call is not null ite means we are beyond the 'local media' phase
        // so don't call the mediaPlaying prop.

        if (this.props.call != null) {
            switch (this.props.call.state) {
                case 'established':
                    this.startCall(this.props.call);
                    break;
                case 'incoming':
                    this.props.mediaPlaying();
                    // fall through
                default:
                    this.props.call.on('stateChanged', this.callStateChanged);
                    break;
            }
        } else {
            this.props.mediaPlaying();
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
        const localStream = this.props.call.getLocalStreams()[0];

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

    showDtmfModal() {
        this.setState({showDtmfModal: true});
    }

    hideDtmfModal() {
        this.setState({showDtmfModal: false});
    }

    startCallTimer() {
        const startTime = new Date();
        this.callTimer = setInterval(() => {
            const duration = moment.duration(new Date() - startTime).format('hh:mm:ss', {trim: false});
            this.setState({callDuration: duration});
        }, 300);
    }

    render() {
        const commonButtonClasses = classNames({
            'btn'           : true,
            'btn-round'     : true,
            'btn-default'   : true
        });

        const muteButtonIconClasses = classNames({
            'fa'                    : true,
            'fa-microphone'         : !this.state.audioMuted,
            'fa-microphone-slash'   : this.state.audioMuted
        });

        const headerTextClasses = classNames({
            'lead'          : true,
            'text-success'  : this.state.callDuration !== null,
            'text-info'     : this.state.callDuration === null
        });

        let callDuration;
        if (this.state.callDuration !== null) {
            callDuration = <span><i className="fa fa-clock-o"></i> {this.state.callDuration}</span>;
        } else {
            callDuration = 'Connecting...';
        }

        return (
            <div>
                <div key="header" className="call-header">
                    <p className={headerTextClasses}><strong>Call with</strong> {this.props.remoteIdentity}</p>
                    <p className={headerTextClasses}>{callDuration}</p>
                </div>
                <audio id="remoteAudio" ref="remoteAudio" autoPlay />
                <span className="fa-stack fa-4">
                    <i className="fa fa-volume-off move-icon fa-stack-2x"></i>
                    <i className="move-icon2 fa fa-volume-up fa-stack-2x animate-sound1"></i>
                </span>
                <div className="call-buttons">
                    <button key="muteAudio" type="button" className={commonButtonClasses} onClick={this.muteAudio}>
                        <i className={muteButtonIconClasses}></i>
                    </button>
                    <button key="dtmfButton" type="button" disabled={this.state.callDuration === null} className={commonButtonClasses} onClick={this.showDtmfModal}>
                        <i className="fa fa-fax"></i>
                    </button>
                    <br />
                    <button key="hangupButton" type="button" className="btn btn-round-big btn-danger" onClick={this.hangupCall}>
                        <i className="fa fa-phone rotate-135"></i>
                    </button>
                </div>
                <DTMFModal
                    show={this.state.showDtmfModal}
                    hide={this.hideDtmfModal}
                    call={this.props.call}
                />
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
