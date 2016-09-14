'use strict';

const React                     = require('react');
const ReactCSSTransitionGroup   = require('react-addons-css-transition-group');
const ReactMixin                = require('react-mixin');
const ReactBootstrap            = require('react-bootstrap');
const Popover                   = ReactBootstrap.Popover;
const OverlayTrigger            = ReactBootstrap.OverlayTrigger;
const rtcninja                  = require('rtcninja');
const classNames                = require('classnames');
const debug                     = require('debug');
const moment                    = require('moment');
const momentFormat              = require('moment-duration-format');
const Clipboard                 = require('clipboard');

const utils                     = require('../utils');
const FullscreenMixin           = require('../mixins/FullScreen');
const ConferenceCarousel        = require('./ConferenceCarousel');
const ConferenceParticipant     = require('./ConferenceParticipant');
const ConferenceParticipantSelf = require('./ConferenceParticipantSelf');


const DEBUG = debug('blinkrtc:ConferenceBox');


class ConferenceBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            callOverlayVisible: true,
            audioMuted: false,
            videoMuted: false,
            callDuration: null,
            participants: props.call.participants.slice(),
            currentLargeVideo: null
        };

        this.callTimer = null;
        this.overlayTimer = null;
        this.clipboard = new Clipboard('#shareBtn');

        // ES6 classes no longer autobind
        [
            'showOverlay',
            'handleFullscreen',
            'muteAudio',
            'muteVideo',
            'hangup',
            'onParticipantJoined',
            'onParticipantLeft',
            'onParticipantStateChanged',
            'onVideoSelected',
            'maybeSwitchLargeVideo',
            'handleClipboardButton'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });
    }

    componentDidMount() {
        for (let p of this.state.participants) {
            p.on('stateChanged', this.onParticipantStateChanged);
            p.attach();
        }
        this.props.call.on('participantJoined', this.onParticipantJoined);
        this.props.call.on('participantLeft', this.onParticipantLeft);

        this.armOverlayTimer();
        this.startCallTimer();

        setTimeout(() => {
            this.maybeSwitchLargeVideo();
        });
    }

    componentWillUnmount() {
        clearTimeout(this.overlayTimer);
        clearTimeout(this.callTimer);

        this.exitFullscreen();

        this.refs.largeVideo.src = '';

        this.clipboard.destroy();
        this.clipboard = null;
    }

    onParticipantJoined(p) {
        DEBUG(`Participant joined: ${p.identity}`);
        p.on('stateChanged', this.onParticipantStateChanged);
        p.attach();
        this.setState({
            participants: this.state.participants.concat([p])
        });
    }

    onParticipantLeft(p) {
        DEBUG(`Participant left: ${p.identity}`);
        p.detach();
        const participants = this.state.participants.slice();
        const idx = participants.indexOf(p);
        if (idx !== -1) {
            participants.splice(idx, 1);
            this.setState({
                participants: participants
            });
        }
    }

    onParticipantStateChanged(oldState, newState) {
        if (oldState === 'established' || newState === 'established' || newState === null) {
            this.maybeSwitchLargeVideo();
        }
    }

    onVideoSelected(item) {
        DEBUG('Switching video to: %o', item);
        if (item.stream) {
            this.setState({currentLargeVideo: item.stream});
            rtcninja.attachMediaStream(this.refs.largeVideo, item.stream);
        } else {
            this.setState({currentLargeVideo: null});
            this.refs.largeVideo.src = '';
        }
    }

    maybeSwitchLargeVideo() {
        // Switch the large video to another source, maybe.
        if (this.state.currentLargeVideo == null ||
            !this.state.currentLargeVideo.active ||
            this.state.currentLargeVideo === this.props.call.getLocalStreams()[0]) {

            let done = false;
            for (let p of this.state.participants) {
                const streams = p.streams;
                if (streams.length > 0 && streams[0].active && streams[0].getVideoTracks().length > 0) {
                    const item = {
                        stream: streams[0],
                        identity: p.identity
                    };
                    this.onVideoSelected(item);
                    done = true;
                    break;
                }
            }
            if (!done) {
                // none of the participants are eligible, show ourselves
                const item = {
                    stream: this.props.call.getLocalStreams()[0],
                    identity: this.props.call.localIdentity
                };
                this.onVideoSelected(item);
            }
        }
    }

    handleFullscreen(event) {
        event.preventDefault();
        this.toggleFullscreen(document.body);
    }

    handleClipboardButton() {
        utils.postNotification('Join me, maybe?', {body: 'URL copied to the clipboard'});
        this.refs.shareOverlay.hide();
    }

    muteAudio(event) {
        event.preventDefault();
        const localStream = this.props.call.getLocalStreams()[0];
        if (localStream.getAudioTracks().length > 0) {
            const track = localStream.getAudioTracks()[0];
            if(this.state.audioMuted) {
                DEBUG('Unmute microphone');
                track.enabled = true;
                this.setState({audioMuted: false});
            } else {
                DEBUG('Mute microphone');
                track.enabled = false;
                this.setState({audioMuted: true});
            }
        }
    }

    muteVideo(event) {
        event.preventDefault();
        const localStream = this.props.call.getLocalStreams()[0];
        if (localStream.getVideoTracks().length > 0) {
            const track = localStream.getVideoTracks()[0];
            if(this.state.videoMuted) {
                DEBUG('Unmute camera');
                track.enabled = true;
                this.setState({videoMuted: false});
            } else {
                DEBUG('Mute camera');
                track.enabled = false;
                this.setState({videoMuted: true});
            }
        }
    }

    hangup(event) {
        event.preventDefault();
        for (let participant of this.state.participants) {
            participant.detach();
        }
        this.props.hangup();
    }

    startCallTimer() {
        const startTime = new Date();
        this.callTimer = setInterval(() => {
            const duration = moment.duration(new Date() - startTime).format('hh:mm:ss', {trim: false});
            this.setState({callDuration: duration});
        }, 300);
    }

    armOverlayTimer() {
        clearTimeout(this.overlayTimer);
        this.overlayTimer = setTimeout(() => {
            this.setState({callOverlayVisible: false});
        }, 4000);
    }

    showOverlay() {
        this.setState({callOverlayVisible: true});
        this.armOverlayTimer();
    }

    render() {
        if (this.props.call === null) {
            return (<div></div>);
        }

        let videoHeader;
        let callButtons;

        const isLocalStream = this.state.currentLargeVideo === this.props.call.getLocalStreams()[0];
        const hasVideo = this.state.currentLargeVideo !== null ? this.state.currentLargeVideo.getVideoTracks().length > 0 : false;

        const largeVideoClasses = classNames({
            'animated'      : true,
            'fadeIn'        : true,
            'large'         : true,
            'mirror'        : isLocalStream && hasVideo,
            'poster'        : !hasVideo
        });

        if (this.state.callOverlayVisible) {
            const muteButtonIcons = classNames({
                'fa'                    : true,
                'fa-microphone'         : !this.state.audioMuted,
                'fa-microphone-slash'   : this.state.audioMuted
            });

            const muteVideoButtonIcons = classNames({
                'fa'                    : true,
                'fa-video-camera'       : !this.state.videoMuted,
                'fa-video-camera-slash' : this.state.videoMuted
            });

            const fullScreenButtonIcons = classNames({
                'fa'            : true,
                'fa-expand'     : !this.isFullScreen(),
                'fa-compress'   : this.isFullScreen()
            });

            const videoHeaderTextClasses = classNames({
                'lead'          : true,
                'text-success'  : true
            });

            const commonButtonClasses = classNames({
                'btn'           : true,
                'btn-round'     : true,
                'btn-default'   : true
            });

            const remoteIdentity = this.props.call.remoteIdentity.displayName || this.props.call.remoteIdentity.uri;

            let callDetail;
            if (this.state.callDetail !== null) {
                const participantCount = this.state.participants.length + 1;
                callDetail = (
                    <span>
                        <i className="fa fa-clock-o"></i> {this.state.callDuration}
                        &nbsp;&mdash;&nbsp;
                        <i className="fa fa-users"></i> {participantCount} participant{participantCount > 1 ? 's' : ''}
                    </span>
                );
            } else {
                callDetail = 'Connecting...'
            }

            videoHeader = (
                    <div key="header" className="call-header">
                        <p className={videoHeaderTextClasses}><strong>Conference:</strong> {remoteIdentity}</p>
                        <p className={videoHeaderTextClasses}>{callDetail}</p>
                    </div>
            );

            let callUrl;
            if (window.location.origin.startsWith('file://')) {
                callUrl = `${config.publicUrl}/#!/conference/${this.props.call.remoteIdentity.uri}`;
            } else {
                callUrl = `${window.location.origin}/#!/conference/${this.props.call.remoteIdentity.uri}`;
            }
            const shareOverlay = (
                <Popover id="shareOverlay" title="Join me, maybe?">
                    Share <strong><a href={callUrl} target="_blank" rel="noopener noreferrer">this link</a></strong> with others so they can easily join this conference.
                    <div className="text-center">
                        <button id="shareBtn" className="btn btn-link" onClick={this.handleClipboardButton} data-clipboard-text={callUrl}>
                            <strong>Copy to clipboard</strong>
                        </button>
                    </div>
                </Popover>
            );

            callButtons = (
                <div className="conference-buttons">
                        <button key="muteVideo" type="button" className={commonButtonClasses} onClick={this.muteVideo}> <i className={muteVideoButtonIcons}></i> </button>
                        <button key="muteAudio" type="button" className={commonButtonClasses} onClick={this.muteAudio}> <i className={muteButtonIcons}></i> </button>
                        {(() => {
                            if (this.isFullscreenSupported()) {
                                return <button key="fsButton" type="button" className={commonButtonClasses} onClick={this.handleFullscreen}> <i className={fullScreenButtonIcons}></i> </button>;
                            }
                        })()}
                        <OverlayTrigger ref="shareOverlay" trigger="click" placement="bottom" overlay={shareOverlay} rootClose>
                            <button key="shareButton" type="button" className={commonButtonClasses}> <i className="fa fa-share"></i> </button>
                        </OverlayTrigger>
                        <button key="hangupButton" type="button" className="btn btn-round btn-danger" onClick={this.hangup}> <i className="fa fa-phone rotate-135"></i> </button>
                </div>
            );
        }

        const participants = [];

        if (this.state.participants.length > 0) {
            participants.push(<ConferenceParticipantSelf
                                    key="myself"
                                    stream={this.props.call.getLocalStreams()[0]}
                                    identity={this.props.call.localIdentity}
                                    selected={this.onVideoSelected}
                              />
            );
        }

        this.state.participants.forEach((p) => {
            participants.push(<ConferenceParticipant
                                    key={p.id}
                                    participant={p}
                                    selected={this.onVideoSelected}
                              />
            );
        });

        return (
            <div className="video-container conference">
                <ReactCSSTransitionGroup transitionName="videoheader" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
                    {videoHeader}
                    {callButtons}
                </ReactCSSTransitionGroup>
                <video ref="largeVideo" className={largeVideoClasses} onMouseMove={this.showOverlay} poster="/assets/images/transparent-1px.png" autoPlay muted />
                <div className="conference-thumbnails">
                    <ConferenceCarousel>
                        {participants}
                    </ConferenceCarousel>
                </div>
            </div>
        );
    }
}

ConferenceBox.propTypes = {
    call: React.PropTypes.object,
    hangup: React.PropTypes.func
};

ReactMixin(ConferenceBox.prototype, FullscreenMixin);


module.exports = ConferenceBox;
