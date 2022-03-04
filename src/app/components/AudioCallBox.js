'use strict';

const React             = require('react');
const PropTypes         = require('prop-types');
const { default: clsx } = require('clsx');
const debug             = require('debug');
const hark              = require('hark');
const sylkrtc           = require('sylkrtc');
const {
    NetworkCheck: NetworkCheckIcon
}                       = require('@material-ui/icons');

const CallOverlay      = require('./CallOverlay');
const ConferenceDrawer = require('./ConferenceDrawer');
const DTMFModal        = require('./DTMFModal');
const Statistics       = require('./Statistics');
const UserIcon         = require('./UserIcon');
const EscalateConferenceModal = require('./EscalateConferenceModal');
const SwitchDevicesMenu       = require('./SwitchDevicesMenu');

const DEBUG = debug('blinkrtc:AudioCallBox');


class AudioCallBox extends React.Component {
    constructor(props) {
        super(props);
        const data = new Array(60);
        data.fill({})

        this.state = {
            active                      : false,
            audioMuted                  : false,
            showDtmfModal               : false,
            showEscalateConferenceModal : false,
            showAudioSwitchMenu         : false,
            showStatistics              : false,
            audioGraphData              : data,
            lastData                    : {}
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
            'toggleAudioSwitchMenu',
            'toggleStatistics',
            'escalateToConference',
            'onKeyDown',
            'statistics'
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
            this.props.call.statistics.on('stats', statistics);
        } else {
            this.props.mediaPlaying();
        }
        document.addEventListener('keydown', this.onKeyDown);
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.call == null && this.props.call) {
            this.props.call.statistics.on('stats', statistics);
            if (this.props.call.state === 'established') {
                this.attachStream(this.props.call);
            } else {
                this.props.call.on('stateChanged', this.callStateChanged);
            }
        }
    }

    componentWillUnmount() {
        if (this.speechEvents !== null) {
            this.speechEvents.stop();
            this.speechEvents = null;
        }
        document.removeEventListener('keydown', this.onKeyDown);
        this.props.call.statistics.removeListener('stats', statistics);
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

    statistics(stats) {
        const audioData = stats.data.audio;
        const audioRemoteData = stats.data.remote.audio;
        const audioRemoteExists = audioRemoteData.inbound[0];

        if (!audioRemoteExists) {
            return;
        }

        const audioJitter = audioData.inbound[0].jitter || 0;
        const audioRTT = audioRemoteData.inbound[0].roundTripTime || 0;

        const audioPacketsLostOutbound = audioRemoteExists && audioRemoteData.inbound[0].packetLossRate || 0;
        const audioPacketsLostInbound = audioData.inbound[0].packetLossRate || 0;
        const audioPacketRateOutbound = (audioData && audioData.outbound[0].packetRate )|| 0;
        const audioPacketRateInbound = (audioData && audioData.inbound[0].packetRate )|| 0;

        const addData = {
            timestamp: audioData.timestamp,
            incomingBitrate: audioData.inbound[0].bitrate/1000 || 0,
            outgoingBitrate: audioData.outbound[0].bitrate/1000 || 0,
            rtt: audioRTT,
            jitter: audioJitter,
            packetsLostOutbound: audioPacketsLostOutbound,
            packetsLostInbound: audioPacketsLostInbound,
            packetRateOutbound: audioPacketRateOutbound,
            packetRateInbound: audioPacketRateInbound
        };
        this.setState(state => {
            const audioGraphData = state.audioGraphData.concat(addData);
            audioGraphData.shift();
            return {
                audioGraphData,
                lastData: stats.data
            };
        });
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

    toggleAudioSwitchMenu(event) {
        if (!event) {
            this.setState({
                showAudioSwitchMenu : !this.state.showAudioSwitchMenu
            });
        } else {
            event.currentTarget.blur();
            this.setState({
                switchAnchor: event.currentTarget,
                showAudioSwitchMenu : !this.state.showAudioSwitchMenu
            });
        }
    }

    toggleStatistics() {
        this.setState({
            showStatistics: !this.state.showStatistics
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

        const menuButtonClasses = clsx({
            'btn'          : true,
            'btn-round-xs' : true,
            'btn-default'  : true,
            'overlap'      : true,
            'overlap-top'  : true
        });

        const menuButtonIcons = clsx({
            'fa'           : true,
            'fa-caret-up'  : true
        });

        let remoteIdentity;

        if (this.props.call !== null) {
            remoteIdentity = this.props.call.remoteIdentity;
        } else {
            remoteIdentity = {uri: this.props.remoteIdentity};
        }

        return (
            <div>
                {this.props.call &&
                    <SwitchDevicesMenu
                        show={this.state.showAudioSwitchMenu}
                        anchor={this.state.switchAnchor}
                        close={this.toggleAudioSwitchMenu}
                        call={this.props.call}
                        setDevice={this.props.setDevice}
                        direction="up"
                        audio
                    />
                }
                <CallOverlay
                    show = {true}
                    remoteIdentity = {this.props.remoteIdentity}
                    call = {this.props.call}
                    forceTimerStart = {this.props.forceTimerStart}
                />
                <audio id="remoteAudio" ref={this.remoteAudio} autoPlay />
                <div className="call-user-icon">
                    <UserIcon identity={remoteIdentity} large={true} active={this.state.active} />
                    </div>
                    <div className="call-buttons">
                            <button key="statisticsBtn" type="button" className={commonButtonClasses} onClick={this.toggleStatistics}>
                                <NetworkCheckIcon />
                            </button>
                        <button key="escalateButton" type="button" className={commonButtonClasses} onClick={this.toggleEscalateConferenceModal}>
                            <i className="fa fa-user-plus"></i>
                        </button>
                        <div className="btn-container" key="audio">
                            <button key="muteAudio" type="button" className={commonButtonClasses} onClick={this.muteAudio}> <i className={muteButtonIconClasses}></i> </button>
                            <button key="audiodevices" type="button" title="Select audio devices" className={menuButtonClasses} onClick={this.toggleAudioSwitchMenu}> <i className={menuButtonIcons}></i> </button>
                        </div>
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
                    <ConferenceDrawer
                        show = {this.state.showStatistics && !this.state.showChat}
                        anchor = "left"
                        showClose = {true}
                        close = {this.toggleStatistics}
                        transparent={true}
                    >
                        <Statistics
                            audioData={this.state.audioGraphData}
                            lastData={this.state.lastData}
                        />
                    </ConferenceDrawer>
                </div>
        );
    }
}

AudioCallBox.propTypes = {
    setDevice               : PropTypes.func.isRequired,
    call                    : PropTypes.object,
    escalateToConference    : PropTypes.func,
    hangupCall              : PropTypes.func,
    mediaPlaying            : PropTypes.func,
    remoteIdentity          : PropTypes.string,
    forceTimerStart         : PropTypes.bool
};


module.exports = AudioCallBox;
