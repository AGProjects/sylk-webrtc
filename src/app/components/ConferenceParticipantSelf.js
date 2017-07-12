'use strict';

const React             = require('react');
const PropTypes         = require('prop-types');
const ReactBootstrap    = require('react-bootstrap');
const Tooltip           = ReactBootstrap.Tooltip;
const OverlayTrigger    = ReactBootstrap.OverlayTrigger;
const sylkrtc           = require('sylkrtc');
const hark              = require('hark');
const classNames        = require('classnames');


class ConferenceParticipantSelf extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            active: false,
            hasVideo: false
        }
        this.speechEvents = null;
        this.speechActivityTimer = null;

    }

    componentDidMount() {
        sylkrtc.utils.attachMediaStream(this.props.stream, this.refs.videoElement, {disableContextMenu: true});

        // factor it out to a function to avoid lint warning about calling setState here
        this.attachSpeechEvents();
    }

    componentWillUnmount() {
        if (this.speechEvents !== null) {
            this.speechEvents.stop();
            this.speechEvents = null;
        }
        clearInterval(this.speechActivityTimer);
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

        const classes = classNames({
            'mirror' : this.state.hasVideo,
            'poster' : !this.state.hasVideo,
            'conference-active' : this.state.active
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
            <div>
                {muteIcon}
                <OverlayTrigger placement="top" overlay={tooltip}>
                    <div className="participant-container">
                        <video ref="videoElement" className={classes}  poster="assets/images/transparent-1px.png" autoPlay muted />
                    </div>
                </OverlayTrigger>
            </div>
        );
    }
}

ConferenceParticipantSelf.propTypes = {
    stream: PropTypes.object.isRequired,
    identity: PropTypes.object.isRequired,
    active: PropTypes.func.isRequired,
    audioMuted: PropTypes.bool.isRequired
};


module.exports = ConferenceParticipantSelf;
