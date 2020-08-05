'use strict';

const React             = require('react');
const PropTypes         = require('prop-types');
const { default: clsx } = require('clsx');
const debug             = require('debug');
const hark              = require('hark');
const sylkrtc           = require('sylkrtc');

const CallOverlay   = require('./CallOverlay');
const DTMFModal     = require('./DTMFModal');
const EscalateConferenceModal = require('./EscalateConferenceModal');
const UserIcon       = require('./UserIcon');

const DEBUG = debug('blinkrtc:AudioCallBox');


class AudioCallBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            active                      : false,
            audioMuted                  : false,
            showDtmfModal               : false,
            showEscalateConferenceModal : false
        };
        this.speechEvents = null;

        this.remoteAudio = React.createRef();

        // ES6 classes no longer autobind
        [
            'callStateChanged',
            'hangupCall',
            'muteAudio',
            'showDtmfModal',
            'hideDtmfModal',
            'toggleEscalateConferenceModal',
            'escalateToConference',
            'onKeyDown'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });
    }

    componentDidMount() {
        // This component is used both for as 'local media' and as the in-call component.
        // Thus, if the call is not null it means we are beyond the 'local media' phase
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
        document.addEventListener('keydown', this.onKeyDown);
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
        if (this.speechEvents !== null) {
            this.speechEvents.stop();
            this.speechEvents = null;
        }
        document.removeEventListener('keydown', this.onKeyDown);
    }

    onKeyDown(event) {
        if (!this.state.showEscalateConferenceModal && !this.state.showDtmfModal) {
            switch (event.which) {
                case 77:    // m/M
                    this.muteAudio(event)
                    break;
                default:
                    break;
            }
        }
    }

    callStateChanged(oldState, newState, data) {
        if (newState === 'established') {
            this.attachStream(this.props.call);
        }
    }

    attachStream(call) {
        const remoteStream = call.getRemoteStreams()[0];
        sylkrtc.utils.attachMediaStream(remoteStream, this.remoteAudio.current);
        const options = {
            interval: 225,
            play: false
        };
        this.speechEvents = hark(remoteStream, options);
        this.speechEvents.on('speaking', () => {
            this.setState({active: true});
        });
        this.speechEvents.on('stopped_speaking', () => {
            this.setState({active: false});
        });
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
            showEscalateConferenceModal: !this.state.showEscalateConferenceModal
        });
    }
    render() {
        const commonButtonClasses = clsx({
            'btn'           : true,
            'btn-round'     : true,
            'btn-default'   : true
        });

        const muteButtonIconClasses = clsx({
            'fa'                    : true,
            'fa-microphone'         : !this.state.audioMuted,
            'fa-microphone-slash'   : this.state.audioMuted
        });

        let remoteIdentity;

        if (this.props.call !== null) {
            remoteIdentity = this.props.call.remoteIdentity;
        } else {
            remoteIdentity = {uri: this.props.remoteIdentity};
        }

        return (
            <div>
                <CallOverlay
                    show = {true}
                    remoteIdentity = {this.props.remoteIdentity}
                    call = {this.props.call}
                />
                <audio id="remoteAudio" ref={this.remoteAudio} autoPlay />
                <div className="call-user-icon">
                    <UserIcon identity={remoteIdentity} large={true} active={this.state.active} />
                </div>
                <div className="call-buttons">
                    <button key="escalateButton" type="button" className={commonButtonClasses} onClick={this.toggleEscalateConferenceModal}>
                        <i className="fa fa-user-plus"></i>
                    </button>
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
    call                    : PropTypes.object,
    escalateToConference    : PropTypes.func,
    hangupCall              : PropTypes.func,
    mediaPlaying            : PropTypes.func,
    remoteIdentity          : PropTypes.string
};

module.exports = AudioCallBox;
