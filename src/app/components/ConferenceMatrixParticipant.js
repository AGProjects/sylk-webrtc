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
        this.emaBitrate = 0;
        this.alpha = 0.4;
        this.lastSample = null;
        this.lowSamples = 0;
        this.holdOff = 3;   // consecutive black + low-bitrate samples before hiding

        this.canvas = document.createElement('canvas');
        this.canvas.width = 32;
        this.canvas.height = 18;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

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

    componentDidUpdate() {
        if (this.state.sharesScreen && this.isBlackFrame() === false) {
            if (!this.state.hasVideo) this.setState({ hasVideo: true });
            return;
        }
        const data = this.props.stats?.packetLossData;
        if (!data || !data.length || !this.props.participant) return;

        const latest = data[data.length - 1];
        if (latest === this.lastSample) return;   // don't count the same sample twice
        this.lastSample = latest;

        const bitrate = latest?.inboundVideoBitrate;
        const packets = latest?.packetRateInbound;
        if (!Number.isFinite(bitrate)) return;

        this.emaBitrate = this.alpha * bitrate + (1 - this.alpha) * this.emaBitrate;

        const participants = Math.max(this.props.participant._conference.participants.length - 1, 1);
        const looksLikeVideo = this.emaBitrate > 100000 / participants && packets > 5;

        if (looksLikeVideo) {
            this.lowSamples = 0;
            if (!this.state.hasVideo) this.setState({ hasVideo: true });
            return;
        }

        const black = this.isBlackFrame();

        if (!this.state.hasVideo) {
            // quiet stream but real pixels: show it
            if (black === false) this.setState({ hasVideo: true });
            return;
        }

        // bitrate is low: only hide if the picture is really black, several samples in a row
        if (black === true) {
            if (++this.lowSamples >= this.holdOff) {
                this.lowSamples = 0;
                this.setState({ hasVideo: false });
            }
        } else {
            this.lowSamples = 0;
        }
    }

    isBlackFrame() {
        const video = this.videoElement.current;
        if (!video || video.readyState < 2 || !video.videoWidth) return null; // unknown

        this.ctx.drawImage(video, 0, 0, this.canvas.width, this.canvas.height);
        const { data } = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);

        let max = 0;
        for (let i = 0; i < data.length; i += 4) {
            const y = (data[i] * 3 + data[i + 1] * 6 + data[i + 2]) / 10;
            if (y > max) max = y;
        }
        return max < 12;
    }

    onParticipantStateChanged(oldState, newState) {
        if (newState === 'established') {
            this.maybeAttachStream();
        }
    }

    handleResize(event) {
        // console.log(event.srcElement.videoWidth);
        const resolutions = ['1280x720', '960x540', '640x480', '640x360', '480x270', '320x180'];
        const { videoWidth, videoHeight } = event.target;
        if (!videoWidth || !videoHeight) return;

        const sharesScreen = resolutions.indexOf(videoWidth + 'x' + videoHeight) === -1;
        if (sharesScreen !== this.state.sharesScreen) {
            if (!sharesScreen) this.emaBitrate = 100000;
            this.setState({ sharesScreen });
        }
    }

    maybeAttachStream() {
        const streams = this.props.participant.streams;
        if (streams.length > 0) {
            sylkrtc.utils.attachMediaStream(streams[0], this.videoElement.current, {muted: this.props.isLocal});
            if (!this.props.isLocal && streams[0].getAudioTracks().length > 0) {
                const el = this.props.audioManager.createAudio(this.props.participant.id)
                sylkrtc.utils.attachMediaStream(streams[0], el, {muted: true});
            }

            this.setState({hasVideo: streams[0].getVideoTracks().length > 0});
            if (this.props.pauseVideo && !this.props.isLocal) {
                this.props.participant.pauseVideo();
            }
            const options = {
                interval: 150,
                play: false
            };
            if (streams[0].getAudioTracks().length > 0) {
                this.speechEvents = hark(streams[0], options);
                this.speechEvents.on('speaking', () => {
                    this.setState({active: true});
                });
                this.speechEvents.on('stopped_speaking', () => {
                    this.setState({active: false});
                });
            }
        }
    }

    render() {
        const classes = clsx({
            'poster' : !this.state.hasVideo,
            'fit'    : this.state.sharesScreen,
            'mirror' : this.props.isLocal && !this.state.sharesScreen
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
                {(this.props.pauseVideo === true || !this.state.hasVideo) && <UserIcon identity={this.props.participant.identity} active={this.state.active} lookup={!this.props.isLocal} large />}
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
    stats: PropTypes.object,
    audioManager: PropTypes.object.isRequired
};


module.exports = ConferenceMatrixParticipant;
