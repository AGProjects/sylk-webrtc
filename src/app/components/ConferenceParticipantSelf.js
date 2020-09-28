'use strict';

const React             = require('react');
const PropTypes         = require('prop-types');
const ReactBootstrap    = require('react-bootstrap');
const Tooltip           = ReactBootstrap.Tooltip;
const OverlayTrigger    = ReactBootstrap.OverlayTrigger;
const sylkrtc           = require('sylkrtc');
const hark              = require('hark');
const { default: clsx } = require('clsx');
const UserIcon = require('./UserIcon');

class ConferenceParticipantSelf extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            active: false,
            hasVideo: false,
            sharesScreen: false
        }
        this.speechEvents = null;
    }

    componentDidMount() {
        sylkrtc.utils.attachMediaStream(this.props.stream, this.refs.videoElement, {disableContextMenu: true, muted: true});

        // factor it out to a function to avoid lint warning about calling setState here
        this.attachSpeechEvents();
        this.refs.videoElement.onresize = (event) => {
            this.handleResize(event)
        };
        if (this.props.audioOnly) {
            this.props.stream
        }
    }

    handleResize(event) {
        const resolutions = [ '1280x720', '960x540', '640x480', '640x360', '480x270','320x180'];
        const videoResolution = event.target.videoWidth + 'x' + event.target.videoHeight;
        if (resolutions.indexOf(videoResolution) === -1) {
            this.setState({sharesScreen: true});
        } else {
            this.setState({sharesScreen: false});
        }
    }

    componentWillUnmount() {
        if (this.speechEvents !== null) {
            this.speechEvents.stop();
            this.speechEvents = null;
        }
    }

    attachSpeechEvents() {
        this.setState({hasVideo: this.props.stream.getVideoTracks().length > 0});

        const options = {
            interval: 150,
            play: false
        };
        this.speechEvents = hark(this.props.stream, options);
        this.speechEvents.on('speaking', () => {
            this.setState({active: true});
        });
        this.speechEvents.on('stopped_speaking', () => {
            this.setState({active: false});
        });
    }

    render() {
        if (this.props.stream == null) {
            return false;
        }

        const tooltip = (
            <Tooltip id="t-myself">{this.props.identity.displayName || this.props.identity.uri}</Tooltip>
        );

        const classes = clsx({
            'mirror' : this.state.hasVideo && !this.state.sharesScreen && !this.props.generatedVideoTrack,
            'poster' : !this.state.hasVideo,
            'fit'    : this.state.hasVideo && this.state.sharesScreen,
            'conference-active' : this.state.active,
            'hide' : !this.state.hasVideo
        });

        let muteIcon
        if (this.props.audioMuted) {
            muteIcon = (
                <div className="mute-self">
                    <i className="fa fa-2x fa-microphone-slash"></i>
                </div>
            );
        }

        return (
            <div style={this.props.audioOnly === true ? {display: 'none'} : {}}>
                {muteIcon}
                <OverlayTrigger placement="top" overlay={tooltip}>
                    <div className="participant-container">
                        {(!this.state.hasVideo) && <UserIcon identity={this.props.identity} active={this.state.active}  carousel />}
                        <video ref="videoElement" className={classes} poster="assets/images/transparent-1px.png" autoPlay muted />
                    </div>
                </OverlayTrigger>
            </div>
        );
    }
}

ConferenceParticipantSelf.propTypes = {
    stream: PropTypes.object.isRequired,
    identity: PropTypes.object.isRequired,
    audioMuted: PropTypes.bool.isRequired,
    generatedVideoTrack: PropTypes.bool,
    audioOnly: PropTypes.bool
};


module.exports = ConferenceParticipantSelf;
