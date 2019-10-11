'use strict';

const React                 = require('react');
const PropTypes             = require('prop-types');
const TransitionGroup       = require('react-transition-group/TransitionGroup');
const CSSTransition         = require('react-transition-group/CSSTransition');
const ReactMixin            = require('react-mixin');
const ReactBootstrap        = require('react-bootstrap');
const Popover               = ReactBootstrap.Popover;
const OverlayTrigger        = ReactBootstrap.OverlayTrigger;
const Mui                   = require('material-ui');
const IconButton            = Mui.IconButton;
const Badge                 = Mui.Badge;
const Styles                = require('material-ui/styles');
const withStyles            = Styles.withStyles;
const sylkrtc               = require('sylkrtc');
const classNames            = require('classnames');
const debug                 = require('debug');
const moment                = require('moment');
const momentFormat          = require('moment-duration-format');
const superagent            = require('superagent');

const config                            = require('../config');
const utils                             = require('../utils');
const FullscreenMixin                   = require('../mixins/FullScreen');
const AudioPlayer                       = require('./AudioPlayer');
const ConferenceDrawer                  = require('./ConferenceDrawer');
const ConferenceDrawerLog               = require('./ConferenceDrawerLog');
const ConferenceDrawerFiles             = require('./ConferenceDrawerFiles');
const ConferenceDrawerParticipant       = require('./ConferenceDrawerParticipant');
const ConferenceDrawerParticipantList   = require('./ConferenceDrawerParticipantList');
const ConferenceDrawerSpeakerSelection  = require('./ConferenceDrawerSpeakerSelection');
const ConferenceCarousel                = require('./ConferenceCarousel');
const ConferenceParticipant             = require('./ConferenceParticipant');
const ConferenceMatrixParticipant       = require('./ConferenceMatrixParticipant');
const ConferenceParticipantSelf         = require('./ConferenceParticipantSelf');
const DragAndDrop                       = require('./DragAndDrop');
const InviteParticipantsModal           = require('./InviteParticipantsModal');

const DEBUG = debug('blinkrtc:ConferenceBox');


const styleSheet = {
    sharingButton: {
        width: '45px',
        height: '45px',
        backgroundColor: '#fff',
        fontSize:'20px',
        border: '1px solid #fff',
        color: '#333',
        margin: '4px'
    },
    badge: {
        top: '1px',
        width: '20px',
        height: '20px',
        right: '28px',
        fontWeight: 'bold',
        fontSize: '1rem',
        backgroundColor: '#337ab7'
    }
};
class ConferenceBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            callOverlayVisible: true,
            audioMuted: false,
            videoMuted: false,
            participants: props.call.participants.slice(),
            showInviteModal: false,
            showDrawer: false,
            showFiles: false,
            shareOverlayVisible: false,
            activeSpeakers: props.call.activeParticipants.slice(),
            selfDisplayedLarge: false,
            eventLog: [],
            sharedFiles: props.call.sharedFiles.slice()
        };

        const friendlyName = this.props.remoteIdentity.split('@')[0];
        if (window.location.origin.startsWith('file://')) {
            this.callUrl = `${config.publicUrl}/conference/${friendlyName}`;
        } else {
            this.callUrl = `${window.location.origin}/conference/${friendlyName}`;
        }

        const emailMessage  = `You can join me in the conference using a Web browser at ${this.callUrl} ` +
                             'or by using the freely available Sylk WebRTC client app at http://sylkserver.com';
        const subject       = 'Join me, maybe?';

        this.emailLink = `mailto:?subject=${encodeURI(subject)}&body=${encodeURI(emailMessage)}`;

        this.callDuration = null;
        this.callTimer = null;
        this.overlayTimer = null;
        this.logEvent = {};
        this.haveVideo = false;
        this.uploads = [];

        [
            'error',
            'warning',
            'info',
            'debug'
        ].forEach((level) => {
            this.logEvent[level] = (
                (action, messages, originator) => {
                    const log = this.state.eventLog.slice();
                    log.unshift({originator, originator, level: level, action: action, messages: messages});
                    this.setState({eventLog: log});
                }
            );
        });

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
            'onConfigureRoom',
            'onFileSharing',
            'maybeSwitchLargeVideo',
            'handleClipboardButton',
            'handleEmailButton',
            'handleShareOverlayEntered',
            'handleShareOverlayExited',
            'handleActiveSpeakerSelected',
            'handleDrop',
            'handleFiles',
            'downloadFile',
            'toggleInviteModal',
            'toggleDrawer',
            'toggleFiles',
            'preventOverlay'
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
        this.props.call.on('roomConfigured', this.onConfigureRoom);
        this.props.call.on('fileSharing', this.onFileSharing);

        this.armOverlayTimer();
        this.startCallTimer();

        // attach to ourselves first if there are no other participants
        if (this.state.participants.length === 0) {
            setTimeout(() => {
                const item = {
                    stream: this.props.call.getLocalStreams()[0],
                    identity: this.props.call.localIdentity
                };
                this.selectVideo(item);
            });
        } else {
            // this.changeResolution();
        }

        if (this.props.call.getLocalStreams()[0].getVideoTracks().length !== 0) {
            this.haveVideo = true;
        }
    }

    componentWillUnmount() {
        clearTimeout(this.overlayTimer);
        clearTimeout(this.callTimer);
        this.uploads.forEach((upload) => {
            this.props.notificationCenter().removeNotification(upload[1]);
            upload[0].abort();
        })
        this.exitFullscreen();
    }

    onParticipantJoined(p) {
        DEBUG(`Participant joined: ${p.identity}`);
        this.refs.audioPlayerParticipantJoined.play();
        p.on('stateChanged', this.onParticipantStateChanged);
        p.attach();
        this.setState({
            participants: this.state.participants.concat([p])
        });
        // this.changeResolution();
    }

    onParticipantLeft(p) {
        DEBUG(`Participant left: ${p.identity}`);
        this.refs.audioPlayerParticipantLeft.play();
        const participants = this.state.participants.slice();
        const idx = participants.indexOf(p);
        if (idx !== -1) {
            participants.splice(idx, 1);
            this.setState({
                participants: participants
            });
        }
        p.detach(true);
        // this.changeResolution();
    }

    onParticipantStateChanged(oldState, newState) {
        if (newState === 'established' || newState === null) {
            this.maybeSwitchLargeVideo();
        }
    }

    onConfigureRoom(config) {
        const newState = {};
        newState.activeSpeakers = config.activeParticipants;
        this.setState(newState);

        if (config.activeParticipants.length === 0) {
            this.logEvent.info('set speakers to', ['Nobody'], config.originator);
        } else {
            const speakers = config.activeParticipants.map((p) => {return p.identity.displayName || p.identity.uri});
            this.logEvent.info('set speakers to', speakers, config.originator);
        }
        this.maybeSwitchLargeVideo();
    }

    onFileSharing(files) {
        let stateFiles = this.state.sharedFiles.slice();
        stateFiles = stateFiles.concat(files);
        this.setState({sharedFiles: stateFiles});
        files.forEach((file)=>{
            if (file.session !== this.props.call.id) {
                this.props.notificationCenter().postFileShared(file);
            }
        })
    }

    changeResolution() {
        let stream = this.props.call.getLocalStreams()[0];
        if (this.state.participants.length < 2) {
            this.props.call.scaleLocalTrack(stream, 1.5);
        } else if (this.state.participants.length < 5) {
            this.props.call.scaleLocalTrack(stream, 2);
        } else {
            this.props.call.scaleLocalTrack(stream, 1);
        }
    }

    selectVideo(item) {
        DEBUG('Switching video to: %o', item);
        if (item.stream) {
            sylkrtc.utils.attachMediaStream(item.stream, this.refs.largeVideo);
            this.setState({selfDisplayedLarge: true});
        }
    }

    maybeSwitchLargeVideo() {
        // Switch the large video to another source, maybe.
        if (this.state.participants.length === 0 && !this.state.selfDisplayedLarge) {
            // none of the participants are eligible, show ourselves
            const item = {
                stream: this.props.call.getLocalStreams()[0],
                identity: this.props.call.localIdentity
            };
            this.selectVideo(item);
        } else if (this.state.selfDisplayedLarge) {
            this.setState({selfDisplayedLarge: false});
        }
    }

    handleFullscreen(event) {
        event.preventDefault();
        this.toggleFullscreen(document.body);
    }

    handleClipboardButton() {
        utils.copyToClipboard(this.callUrl);
        this.props.notificationCenter().postSystemNotification('Join me, maybe?', {body: 'Link copied to the clipboard'});
        this.refs.shareOverlay.hide();
    }

    handleEmailButton(event) {
        if (navigator.userAgent.indexOf('Chrome') > 0) {
            let emailWindow = window.open(this.emailLink, '_blank');
            setTimeout(() => {
                emailWindow.close();
            }, 500);
        } else {
            window.open(this.emailLink, '_self');
        }
        this.refs.shareOverlay.hide();
    }

    handleShareOverlayEntered() {
        // keep the buttons and overlay visible
        clearTimeout(this.overlayTimer);
        this.setState({shareOverlayVisible: true});
    }

    handleShareOverlayExited() {
        // re-arm the buttons and overlay timeout
        if (!this.state.showDrawer) {
            this.armOverlayTimer();
        }
        this.setState({shareOverlayVisible: false});
    }

    handleActiveSpeakerSelected(participant, secondVideo=false) {      // eslint-disable-line space-infix-ops
        let newActiveSpeakers = this.state.activeSpeakers.slice();
        if (secondVideo) {
            if (participant.id !== 'none') {
                if (newActiveSpeakers.length >= 1) {
                    newActiveSpeakers[1] = participant;
                } else {
                    newActiveSpeakers[0] = participant;
                }
            } else {
                newActiveSpeakers.splice(1,1);
            }
        } else {
            if (participant.id !== 'none') {
                newActiveSpeakers[0] = participant;
            } else {
                newActiveSpeakers.shift();
            }
        }
        this.props.call.configureRoom(newActiveSpeakers.map((element) => element.publisherId), (error) => {
            if (error) {
                // This causes a state update, hence the drawer lists update
                this.logEvent.error('set speakers failed', [], this.localIdentity);
            }
        });
    }

    handleDrop(files) { 
        DEBUG('Dropped file %o', files);
        this.uploadFiles(files);
    };

    handleFiles(e) {
        DEBUG('Selected files %o', e.target.files);
        this.uploadFiles(e.target.files);
    }

    uploadFiles(files) {
        for (var key in files) {
            // is the item a File?
            if (files.hasOwnProperty(key) && files[key] instanceof File) {
                let uploadRequest;
                let complete = false;
                const filename = files[key].name
                let progressNotification = this.props.notificationCenter().postFileUploadProgress(
                    filename, 
                    (notification) => {
                        if (!complete) {
                            uploadRequest.abort();
                            this.uploads.splice(this.uploads.indexOf(uploadRequest), 1);
                        }
                    }
                );
                uploadRequest = superagent
                .post(`${config.fileSharingUrl}/${this.props.remoteIdentity}/${this.props.call.id}/${filename}`)
                .send(files[key])
                .on('progress', (e) => {
                    this.props.notificationCenter().editFileUploadNotification(e.percent, progressNotification);
                })
                .end((err, response) => {
                    complete = true;
                    this.props.notificationCenter().removeFileUploadNotification(progressNotification);
                    if (err) {
                        this.props.notificationCenter().postFileUploadFailed(filename);
                    }
                    this.uploads.splice(this.uploads.indexOf(uploadRequest), 1);
                });
                this.uploads.push([uploadRequest, progressNotification]);
            }
        }
    }

    downloadFile(filename) {
        const a = document.createElement('a');
        a.href = `${config.fileSharingUrl}/${this.props.remoteIdentity}/${this.props.call.id}/${filename}`;
        a.target = '_blank';
        a.download = filename;
        const clickEvent = document.createEvent('MouseEvent');
        clickEvent.initMouseEvent('click', true, true, window, 0,
            clickEvent.screenX, clickEvent.screenY, clickEvent.clientX, clickEvent.clientY,
            clickEvent.ctrlKey, clickEvent.altKey, clickEvent.shiftKey, clickEvent.metaKey,
            0, null);
        a.dispatchEvent(clickEvent);
    }

    preventOverlay(event) {
        // Stop the overlay when we are the thumbnail bar
        event.stopPropagation();
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
            if (this.state.videoMuted) {
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
        if (typeof this.refs.largeVideo !== 'undefined') {
            this.refs.largeVideo.pause();
        }
        this.props.hangup();
    }

    startCallTimer() {
        const startTime = new Date();
        this.callTimer = setInterval(() => {
            this.callDuration = moment.duration(new Date() - startTime).format('hh:mm:ss', {trim: false});
            if (this.state.callOverlayVisible) {
                this.forceUpdate();
            }
        }, 300);
    }

    armOverlayTimer() {
        clearTimeout(this.overlayTimer);
        this.overlayTimer = setTimeout(() => {
            this.setState({callOverlayVisible: false});
        }, 4000);
    }

    showOverlay() {
        if (!this.state.shareOverlayVisible && !this.state.showDrawer && !this.state.showFiles) {
            if (!this.state.callOverlayVisible) {
                this.setState({callOverlayVisible: true});
            }
            this.armOverlayTimer();
        }
    }

    toggleInviteModal() {
        this.setState({showInviteModal: !this.state.showInviteModal});
        if (this.refs.showOverlay) {
            this.refs.shareOverlay.hide();
        }
    }

    toggleDrawer() {
        this.setState({callOverlayVisible: true, showDrawer: !this.state.showDrawer, showFiles: false});
        clearTimeout(this.overlayTimer);
    }

    toggleFiles() {
        this.setState({callOverlayVisible: true, showFiles: !this.state.showFiles, showDrawer: false});
        clearTimeout(this.overlayTimer);
    }

    render() {
        if (this.props.call === null) {
            return (<div></div>);
        }

        let videoHeader;
        let callButtons;
        let watermark;

        const largeVideoClasses = classNames({
            'animated'      : true,
            'fadeIn'        : true,
            'large'         : true,
            'mirror'        : !this.props.call.sharingScreen && !this.props.generatedVideoTrack,
            'fit'           : this.props.call.sharingScreen
        });

        let matrixClasses = classNames({
            'matrix'        : true
        });

        const containerClasses = classNames({
            'video-container': true,
            'conference': true,
            'drawer-visible': this.state.showDrawer || this.state.showFiles
        });

        const remoteIdentity = this.props.remoteIdentity.split('@')[0];

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
                'fa-2x'         : true,
                'fa-expand'     : !this.isFullScreen(),
                'fa-compress'   : this.isFullScreen()
            });

            const screenSharingButtonIcons = classNames({
                'fa'                    : true,
                'fa-clone'              : true,
                'fa-flip-horizontal'    : true,
                'text-warning'          : this.props.call.sharingScreen
            });

            const shareFileButtonIcons = classNames({
                'fa'                    : true,
                'fa-upload'             : true
            });

            const videoHeaderTextClasses = classNames({
                'lead'          : true
            });

            const commonButtonClasses = classNames({
                'btn'           : true,
                'btn-round'     : true,
                'btn-default'   : true
            });

            const commonButtonTopClasses = classNames({
                'btn'           : true,
                'btn-link'      : true
            });

            const shareButtonClasses = classNames(
                commonButtonClasses,
                this.props.classes.sharingButton
            );

            let callDetail;
            if (this.state.callDetail !== null) {
                const participantCount = this.state.participants.length + 1;
                callDetail = (
                    <span>
                        <i className="fa fa-clock-o"></i> {this.callDuration}
                        &nbsp;&mdash;&nbsp;
                        <i className="fa fa-users"></i> {participantCount} participant{participantCount > 1 ? 's' : ''}
                    </span>
                );
            } else {
                callDetail = 'Connecting...'
            }

            const topButtons = [];
            if (this.isFullscreenSupported()) {
                topButtons.push(<button key="fsButton" type="button" title="Go full-screen" className={commonButtonTopClasses} onClick={this.handleFullscreen}> <i className={fullScreenButtonIcons}></i> </button>);
            }

            if (!this.state.showFiles) {
                if (this.state.sharedFiles.length !== 0) {
                    topButtons.push(
                        <Badge badgeContent={this.state.sharedFiles.length} color="primary" classes={{badge: this.props.classes.badge}}>
                            <button key="fbButton" type="button" title="Open Drawer" className={commonButtonTopClasses} onClick={this.toggleFiles}> <i className="fa fa-files-o fa-2x"></i> </button>
                        </Badge>
                    );
                }
            }

            if (!this.state.showDrawer) {
                topButtons.push(<button key="sbButton" type="button" title="Open Drawer" className={commonButtonTopClasses} onClick={this.toggleDrawer}> <i className="fa fa-bars fa-2x"></i> </button>);
            }

            videoHeader = (
                <CSSTransition
                    key="header"
                    classNames="videoheader"
                    timeout={{ enter: 300, exit: 300}}
                >
                    <div key="header" className="call-header">
                        <div className="container-fluid">
                            <p className={videoHeaderTextClasses}><strong>Conference:</strong> {remoteIdentity}</p>
                            <p className={videoHeaderTextClasses}>{callDetail}</p>
                            <div className="conference-top-buttons">
                                {topButtons}
                            </div>

                        </div>
                    </div>
                </CSSTransition>
            );

            const shareOverlay = (
                <Popover id="shareOverlay" title="Join me, maybe?">
                    <p>
                        Invite other online users of this service, share <strong><a href={this.callUrl} target="_blank" rel="noopener noreferrer">this link</a></strong> with others or email, so they can easily join this conference.
                    </p>
                    <div className="text-center">
                        <div className="btn-group">
                            <button className="btn btn-primary" onClick={this.toggleInviteModal} alt="Invite users">
                                <i className="fa fa-user-plus"></i>
                            </button>
                            <button className="btn btn-primary" onClick={this.handleClipboardButton} alt="Copy to clipboard">
                                <i className="fa fa-clipboard"></i>
                            </button>
                            <button className="btn btn-primary" onClick={this.handleEmailButton} alt="Send email">
                                <i className="fa fa-envelope-o"></i>
                            </button>
                        </div>
                    </div>
                </Popover>
            );

            const buttons = [];

            buttons.push(
                <OverlayTrigger key="shareOverlay" ref="shareOverlay" trigger="click" placement="bottom" overlay={shareOverlay} onEntered={this.handleShareOverlayEntered} onExited={this.handleShareOverlayExited} rootClose>
                    <button key="shareButton" type="button" title="Share link to this conference" className={commonButtonClasses}> <i className="fa fa-plus"></i> </button>
                </OverlayTrigger>
            );
            buttons.push(<button key="muteVideo" type="button" title="Mute/unmute video" className={commonButtonClasses} onClick={this.muteVideo}> <i className={muteVideoButtonIcons}></i> </button>);
            buttons.push(<button key="muteAudio" type="button" title="Mute/unmute audio" className={commonButtonClasses} onClick={this.muteAudio}> <i className={muteButtonIcons}></i> </button>);
            buttons.push(<button key="shareScreen" type="button" title="Share screen" className={commonButtonClasses} onClick={this.props.shareScreen} disabled={!this.haveVideo}><i className={screenSharingButtonIcons}></i></button>);
            buttons.push(
                <label htmlFor="outlined-button-file">
                    <IconButton title="Share files" component="span" disableRipple={true} className={shareButtonClasses}>
                        <i className={shareFileButtonIcons}></i>
                    </IconButton>
                </label>
            );
            buttons.push(<button key="hangupButton" type="button" title="Leave conference" className="btn btn-round btn-danger" onClick={this.hangup}> <i className="fa fa-phone rotate-135"></i> </button>);

            callButtons = (
                <CSSTransition
                    key="header2"
                    classNames="videoheader"
                    timeout={{ enter: 300, exit: 300}}
                >
                <div className="conference-buttons">
                    {buttons}
                </div>
                </CSSTransition>
            );
        } else {
            watermark = (
                <CSSTransition
                    key="watermark"
                    classNames="watermark"
                    timeout={{enter: 600, exit: 300}}
                >
                    <div className="watermark"></div>
                </CSSTransition>
            );
        }

        const participants = [];

        if (this.state.participants.length > 0) {
            if (this.state.activeSpeakers.findIndex((element) => {return element.id === this.props.call.id}) === -1) {
                participants.push(
                    <ConferenceParticipantSelf
                        key="myself"
                        stream={this.props.call.getLocalStreams()[0]}
                        identity={this.props.call.localIdentity}
                        audioMuted={this.state.audioMuted}
                        generatedVideoTrack={this.props.generatedVideoTrack}
                    />
                );
            }
        }

        const drawerParticipants = [];
        drawerParticipants.push(
            <ConferenceDrawerParticipant
                key="myself"
                participant={{identity: this.props.call.localIdentity}}
                isLocal={true}
            />
        );

        let videos = [];
        if (this.state.participants.length === 0) {
            videos.push(
                <video ref="largeVideo" key="largeVideo" className={largeVideoClasses} poster="assets/images/transparent-1px.png" autoPlay muted />
            );
        } else {
            const activeSpeakers = this.state.activeSpeakers;
            const activeSpeakersCount = activeSpeakers.length;
            matrixClasses = classNames({
                'matrix'        : true,
                'one-row'       : activeSpeakersCount === 2,
                'two-columns'   : activeSpeakersCount === 2
            });

            if (activeSpeakersCount > 0) {
                activeSpeakers.forEach((p) => {
                    videos.push(
                        <ConferenceMatrixParticipant
                            key={p.id}
                            participant={p}
                            large={activeSpeakers.length <= 1}
                            isLocal={p.id === this.props.call.id}
                        />
                    );
                });

                this.state.participants.forEach((p) => {
                    if (this.state.activeSpeakers.indexOf(p) === -1) {
                        participants.push(
                            <ConferenceParticipant
                                key={p.id}
                                participant={p}
                                selected={this.onVideoSelected}
                            />
                        );
                    }

                    drawerParticipants.push(
                        <ConferenceDrawerParticipant
                            key={p.id}
                            participant={p}
                        />
                    );
                });
            } else {
                matrixClasses = classNames({
                    'matrix'        : true,
                    'one-row'       : this.state.participants.length === 2 ,
                    'two-row'       : this.state.participants.length >= 3 && this.state.participants.length < 7,
                    'three-row'     : this.state.participants.length >= 7,
                    'two-columns'   : this.state.participants.length >= 2 || this.state.participants.length <= 4,
                    'three-columns' : this.state.participants.length > 4
                });
                this.state.participants.forEach((p) => {
                    videos.push(
                        <ConferenceMatrixParticipant
                            key = {p.id}
                            participant = {p}
                            large = {this.state.participants.length <= 1}
                        />
                    );

                    drawerParticipants.push(
                        <ConferenceDrawerParticipant
                            key={p.id}
                            participant={p}
                        />
                    );
                });
            }
        }

        return (
            <DragAndDrop handleDrop={this.handleDrop}>
                <input
                    style={{display:'none'}}
                    id="outlined-button-file"
                    multiple
                    type="file"
                    onInput={this.handleFiles}
                />
                <div className={containerClasses} onMouseMove={this.showOverlay}>
                    <div className="top-overlay">
                        <TransitionGroup>
                            {videoHeader}
                            {callButtons}
                        </TransitionGroup>
                    </div>
                    <TransitionGroup>
                        {watermark}
                    </TransitionGroup>
                    <div className={matrixClasses}>
                        {videos}
                    </div>
                    <div className="conference-thumbnails" onMouseMove={this.preventOverlay}>
                        <ConferenceCarousel align={'right'}>
                            {participants}
                        </ConferenceCarousel>
                    </div>
                    <AudioPlayer ref="audioPlayerParticipantJoined" sourceFile="assets/sounds/participant_joined.wav" />
                    <AudioPlayer ref="audioPlayerParticipantLeft" sourceFile="assets/sounds/participant_left.wav" />
                    <InviteParticipantsModal
                        show={this.state.showInviteModal}
                        call={this.props.call}
                        close={this.toggleInviteModal}
                    />
                </div>
                <ConferenceDrawer show={this.state.showDrawer} close={this.toggleDrawer}>
                    <ConferenceDrawerSpeakerSelection
                        participants={this.state.participants.concat([{id: this.props.call.id, publisherId: this.props.call.id, identity: this.props.call.localIdentity}])}
                        selected={this.handleActiveSpeakerSelected}
                        activeSpeakers={this.state.activeSpeakers}
                    />
                    <ConferenceDrawerParticipantList>
                        {drawerParticipants}
                    </ConferenceDrawerParticipantList>
                    <ConferenceDrawerLog log={this.state.eventLog} />
                </ConferenceDrawer>
                <ConferenceDrawer show={this.state.showFiles} close={this.toggleFiles}>
                    <ConferenceDrawerFiles
                        sharedFiles={this.state.sharedFiles} 
                        downloadFile={this.downloadFile}
                    />
                </ConferenceDrawer>
            </DragAndDrop>
        );
    }
}

ConferenceBox.propTypes = {
    notificationCenter  : PropTypes.func.isRequired,
    shareScreen         : PropTypes.func.isRequired,
    classes             : PropTypes.object.isRequired,
    call                : PropTypes.object,
    hangup              : PropTypes.func,
    remoteIdentity      : PropTypes.string,
    generatedVideoTrack : PropTypes.bool
};

ReactMixin(ConferenceBox.prototype, FullscreenMixin);


module.exports = withStyles(styleSheet)(ConferenceBox);
