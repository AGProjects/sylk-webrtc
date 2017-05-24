'use strict';

const React             = require('react');
const classNames        = require('classnames');
const debug             = require('debug');
const sylkrtc           = require('sylkrtc');

const CallOverlay   = require('./CallOverlay');
const DTMFModal     = require('./DTMFModal');
const EscalateConferenceModal = require('./EscalateConferenceModal');

const DEBUG = debug('blinkrtc:AudioCallBox');


class AudioCallBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            audioMuted                  : false,
            showDtmfModal               : false,
            showEscalateConferenceModal : false
        };

        // ES6 classes no longer autobind
        [
            'callStateChanged',
            'hangupCall',
            'muteAudio',
            'showDtmfModal',
            'hideDtmfModal',
            'toggleEscalateConferenceModal',
            'escalateToConference'
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
                    this.attachStream(this.props.call);
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
                this.attachStream(nextProps.call);
            } else {
                nextProps.call.on('stateChanged', this.callStateChanged);
            }
        }
    }

    componentWillUnmount() {
        clearTimeout(this.callTimer);
    }

    callStateChanged(oldState, newState, data) {
        if (newState === 'established') {
            this.attachStream(this.props.call);
        }
    }

    attachStream(call) {
        const remoteStream = call.getRemoteStreams()[0];
        sylkrtc.utils.attachMediaStream(remoteStream, this.refs.remoteAudio);
    }

    escalateToConference(participants) {
        this.props.escalateToConference(participants);
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

    toggleEscalateConferenceModal() {
        this.setState({
            callOverlayVisible: false,
            showEscalateConferenceModal: !this.state.showEscalateConferenceModal
        });
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

        return (
            <div>
                <CallOverlay
                    show = {true}
                    remoteIdentity = {this.props.remoteIdentity}
                    call = {this.props.call}
                />
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
                    <button key="escalateButton" type="button" className={commonButtonClasses} onClick={this.toggleEscalateConferenceModal}>
                        <i className="fa fa-user-plus"></i>
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
                <EscalateConferenceModal
                    show={this.state.showEscalateConferenceModal}
                    call={this.props.call}
                    close={this.toggleEscalateConferenceModal}
                    escalateToConference={this.escalateToConference}
                />
            </div>
        );
    }
}

AudioCallBox.propTypes = {
    call                    : React.PropTypes.object,
    escalateToConference    : React.PropTypes.func,
    hangupCall              : React.PropTypes.func,
    mediaPlaying            : React.PropTypes.func,
    remoteIdentity          : React.PropTypes.string
};

module.exports = AudioCallBox;
