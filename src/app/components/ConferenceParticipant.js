'use strict';

const React             = require('react');
const PropTypes         = require('prop-types');
const ReactBootstrap    = require('react-bootstrap');
const Tooltip           = ReactBootstrap.Tooltip;
const OverlayTrigger    = ReactBootstrap.OverlayTrigger;
const sylkrtc           = require('sylkrtc');
const hark              = require('hark');
const { default: clsx } = require('clsx');

const CallQuality = require('./CallQuality');
const HandIcon = require('./HandIcon');
const UserIcon = require('./UserIcon');


class ConferenceParticipant extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            active: false,
            hasVideo: false,
            overlayVisible: false,
            audioMuted: false
        }
        this.speechEvents = null;

        this.videoElement = React.createRef();

        // ES6 classes no longer autobind
        [
            'onParticipantStateChanged',
            'onMuteAudioClicked',
            'showOverlay',
            'hideOverlay'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });

        props.participant.on('stateChanged', this.onParticipantStateChanged);
    }

    componentDidMount() {
        this.maybeAttachStream();
        this.videoElement.current.oncontextmenu = (e) => {
            // disable right click for video elements
            e.preventDefault();
        };
    }

    componentWillUnmount() {
        this.videoElement.current.pause();
        this.props.participant.removeListener('stateChanged', this.onParticipantStateChanged);
        if (this.speechEvents !== null) {
            this.speechEvents.stop();
            this.speechEvents = null;
        }
    }

    onParticipantStateChanged(oldState, newState) {
        if (newState === 'established') {
            this.maybeAttachStream();
        }
    }

    onMuteAudioClicked(event) {
        event.preventDefault();
        const streams = this.props.participant.streams;
        if (streams[0].getAudioTracks().length > 0) {
            const track = streams[0].getAudioTracks()[0];
            if(this.state.audioMuted) {
                track.enabled = true;
                this.setState({audioMuted: false});
            } else {
                track.enabled = false;
                this.setState({audioMuted: true});
            }
        }
    }

    maybeAttachStream() {
        const streams = this.props.participant.streams;
        if (streams.length > 0) {
            sylkrtc.utils.attachMediaStream(streams[0], this.videoElement.current);
            const el = this.props.audioManager.createAudio(this.props.participant.id)
            sylkrtc.utils.attachMediaStream(streams[0], el, {muted: true});

            if (this.props.pauseVideo) {
                this.props.participant.pauseVideo();
            }
            this.setState({hasVideo: streams[0].getVideoTracks().length > 0});
            const options = {
                interval: 150,
                play: false
            };
            this.speechEvents = hark(streams[0], options);
            this.speechEvents.on('speaking', () => {
                this.setState({active: true});
            });
            this.speechEvents.on('stopped_speaking', () => {
                this.setState({active: false});
            });
        }
    }

    showOverlay() {
        this.setState({overlayVisible: true});
    }

    hideOverlay() {
        if (!this.state.audioMuted) {
            this.setState({overlayVisible: false});
        }
    }

    render() {
        const tooltip = (
            <Tooltip id={this.props.participant.id}>{this.props.participant.identity.displayName || this.props.participant.identity.uri}</Tooltip>
        );

        const classes = clsx({
            'poster' : !this.state.hasVideo,
            'conference-active' : this.state.active,
            'hide': !this.state.hasVideo
        });

        let muteButton;

        if (this.state.overlayVisible) {
            const muteButtonIcons = clsx({
                'fa'                    : true,
                'fa-microphone'         : !this.state.audioMuted,
                'fa-microphone-slash'   : this.state.audioMuted
            });

            const muteButtonClasses = clsx({
                'btn'         : true,
                'btn-round'   : true,
                'btn-default' : !this.state.audioMuted,
                'btn-warning' : this.state.audioMuted
            });

            muteButton = (
                <div className="mute">
                    <button className={muteButtonClasses} onClick={this.onMuteAudioClicked} title="Mute remote audio locally">
                        <i className={muteButtonIcons}></i>
                    </button>
                </div>
            );
        }

        return (
            <div onMouseMove={this.showOverlay} onMouseLeave={this.hideOverlay}>
                {muteButton}
                <HandIcon
                    raisedHand={this.props.raisedHand}
                    handleHandSelected={() => this.props.handleHandSelected(this.props.participant)}
                    disableHandToggle={this.props.disableHandToggle}
                    thumb
                />
                <CallQuality videoData={this.props.stats && this.props.stats.packetLossData} inbound thumb />
                <OverlayTrigger placement="top" overlay={tooltip}>
                    <div className="participant-container">
                        {(this.props.pauseVideo === true || !this.state.hasVideo) && <UserIcon identity={this.props.participant.identity} active={this.state.active} carousel />}
                        <video ref={this.videoElement} className={classes} poster="assets/images/transparent-1px.png" autoPlay />
                    </div>
                </OverlayTrigger>
            </div>
        );
    }
}

ConferenceParticipant.propTypes = {
    participant: PropTypes.object.isRequired,
    raisedHand: PropTypes.number.isRequired,
    handleHandSelected: PropTypes.func.isRequired,
    disableHandToggle: PropTypes.bool,
    pauseVideo: PropTypes.bool,
    stats: PropTypes.object,
    audioManager: PropTypes.object.isRequired
};


module.exports = ConferenceParticipant;
