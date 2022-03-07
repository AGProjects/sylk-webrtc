'use strict';

const React             = require('react');
const PropTypes         = require('prop-types');

const sylkrtc           = require('sylkrtc');
const hark              = require('hark');
const { default: clsx }  = require('clsx');

const HandIcon    = require('./HandIcon');
const UserIcon    = require('./UserIcon');
const CallQuality = require('./CallQuality');

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

        this.videoElement = React.createRef();
        this.iconElement = React.createRef();

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
        if (!this.props.pauseVideo && this.props.participant.videoPaused) {
            this.props.participant.resumeVideo();
        }
        this.videoElement.current.oncontextmenu = (e) => {
            // disable right click for video elements
            e.preventDefault();
        };
        this.videoElement.current.onresize = (event) => {
            this.handleResize(event);
        };
    }

    componentWillUnmount() {
        this.videoElement.current.pause();
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
        // console.log(event.srcElement.videoWidth);
        const resolutions = ['1280x720', '960x540', '640x480', '640x360', '480x270', '320x180'];
        if (this.state.hasVideo) {
            const videoResolution = event.target.videoWidth + 'x' + event.target.videoHeight;
            if (resolutions.indexOf(videoResolution) === -1) {
                this.setState({sharesScreen: true});
            } else {
                this.setState({sharesScreen: false});
            }
        }
    }

    maybeAttachStream() {
        const streams = this.props.participant.streams;
        if (streams.length > 0) {
            sylkrtc.utils.attachMediaStream(streams[0], this.videoElement.current, {muted: this.props.isLocal});
            this.setState({hasVideo: streams[0].getVideoTracks().length > 0});
            if (this.props.pauseVideo && !this.props.isLocal) {
                this.props.participant.pauseVideo();
            }
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
        const classes = clsx({
            'poster' : !this.state.hasVideo,
            'fit'    : this.state.sharesScreen
        });
        const remoteVideoClasses = clsx({
            'remote-video'      : true,
            'large'             : this.props.large,
            'conference-active' : this.state.active && this.props.audioOnly === false,
            'contains-avatar'   : this.props.audioOnly,
            'avatar-normal'     : !this.state.hasVideo && !this.props.audioOnly,
            'hide'              : this.props.audioOnly && this.props.pauseVideo === false
        });
        const videoClasses = clsx({
            'video'  : true,
            'hide'   : this.props.audioOnly || !this.state.hasVideo,
            'fadeOut': !this.state.hasVideo
        });
        const participantInfo = (
            <div className="controls">
                <p className="lead">{this.props.participant.identity.displayName || this.props.participant.identity.uri}
                    <HandIcon
                        raisedHand={this.props.raisedHand}
                        handleHandSelected={() => this.props.handleHandSelected(this.props.participant)}
                        disableHandToggle={this.props.disableHandToggle}
                    />
                    { this.props.stats &&
                        <React.Fragment>
                            &nbsp;
                            <CallQuality videoData={this.props.stats.packetLossData} inbound />
                        </React.Fragment>
                    }
                </p>
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
                {(this.props.pauseVideo === true || !this.state.hasVideo) && <UserIcon identity={this.props.participant.identity} active={this.state.active} large />}
                <div className={videoClasses}>
                    <video poster="assets/images/transparent-1px.png" className={classes} ref={this.videoElement} autoPlay muted={this.props.isLocal}/>
                </div>
            </div>
        );
    }
}

ConferenceMatrixParticipant.propTypes = {
    participant: PropTypes.object.isRequired,
    raisedHand: PropTypes.number.isRequired,
    handleHandSelected: PropTypes.func.isRequired,
    disableHandToggle: PropTypes.bool,
    large: PropTypes.bool,
    isLocal: PropTypes.bool,
    isGeneratedTrack: PropTypes.bool,
    handleHandSelected: PropTypes.func,
    audioOnly: PropTypes.bool,
    pauseVideo: PropTypes.bool,
    stats: PropTypes.object
};


module.exports = ConferenceMatrixParticipant;
