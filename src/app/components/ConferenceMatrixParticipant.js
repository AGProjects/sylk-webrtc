'use strict';

const React             = require('react');
const PropTypes         = require('prop-types');
const ReactBootstrap    = require('react-bootstrap');
const Tooltip           = ReactBootstrap.Tooltip;
const OverlayTrigger    = ReactBootstrap.OverlayTrigger;
const sylkrtc           = require('sylkrtc');
const hark              = require('hark');
const classNames        = require('classnames');


class ConferenceMatrixParticipant extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            active: false,
            hasVideo: false,
            sharesScreen: false,
            audioMuted: false
        }
        this.speechEvents = null;

        // ES6 classes no longer autobind
        [
            'onParticipantStateChanged'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });

        if (!props.isLocal) {
            props.participant.on('stateChanged', this.onParticipantStateChanged);
        }

    }

    componentDidMount() {
        this.maybeAttachStream();
        this.refs.videoElement.oncontextmenu = (e) => {
            // disable right click for video elements
            e.preventDefault();
        };
        this.refs.videoElement.onresize = (event) => {
            this.handleResize(event)
        };
    }

    componentWillUnmount() {
        this.refs.videoElement.pause();
        if (!this.props.isLocal) {
            this.props.participant.removeListener('stateChanged', this.onParticipantStateChanged);
        }
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

    handleResize(event) {
        if (this.state.hasVideo && event.srcElement.videoWidth !== 1280 && event.srcElement.videoWidth !== 640) {
            this.setState({sharesScreen: true});
        } else {
            this.setState({sharesScreen: false});
        }
    }

    maybeAttachStream() {
        const streams = this.props.participant.streams;
        if (streams.length > 0) {
            sylkrtc.utils.attachMediaStream(streams[0], this.refs.videoElement);
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

    render() {
        const classes = classNames({
            'poster' : !this.state.hasVideo,
            'fit'    : this.state.sharesScreen
        });
        const remoteVideoClasses = classNames({
            'remote-video'      : true,
            'large'             : this.props.large,
            'conference-active' : this.state.active
        });
        const participantInfo = (
            <div className="controls">
                <p className="lead">{this.props.participant.identity.displayName || this.props.participant.identity.uri}</p>
            </div>
        );

        let activeIcon;

        if (this.props.isLocal) {
            activeIcon = (
                <div className="controls-top">
                    <p className="lead"><span className="label label-success">Speaker</span></p>
                </div>
            );
        }

        return (
            <div className={remoteVideoClasses}>
                {activeIcon}
                {participantInfo}
                <div className="video">
                    <video poster="assets/images/transparent-1px.png" className={classes} ref="videoElement" autoPlay muted={this.props.isLocal}/>
                </div>
            </div>
        );
    }
}

ConferenceMatrixParticipant.propTypes = {
    participant: PropTypes.object.isRequired,
    large: PropTypes.bool,
    isLocal: PropTypes.bool
};


module.exports = ConferenceMatrixParticipant;
