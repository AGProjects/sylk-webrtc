'use strict';

const React                 = require('react');
const PropTypes             = require('prop-types');
const classNames            = require('classnames');
const TransitionGroup       = require('react-transition-group/TransitionGroup');
const CSSTransition         = require('react-transition-group/CSSTransition');
const sylkrtc               = require('sylkrtc');
const debug                 = require('debug');

const ConferenceDrawer      = require('./ConferenceDrawer');
const VolumeBar             = require('./VolumeBar');

const ReactBootstrap    = require('react-bootstrap');
const ListGroup         = ReactBootstrap.ListGroup;
const ListGroupItem     = ReactBootstrap.ListGroupItem;

const DEBUG = debug('blinkrtc:Preview');

const styleSheet = {
};

class Preview extends React.Component {
    constructor(props) {
        super(props);

        let mic = {label: 'No mic'};
        let camera = {label: 'No Camera'};

        if ('camera' in this.props.selectedDevices) {
            camera = this.props.selectedDevices.camera;
        } else if (this.props.localMedia.getVideoTracks().length !== 0) {
            camera.label = this.props.localMedia.getVideoTracks()[0].label;
        }

        if ('mic' in this.props.selectedDevices) {
            mic = this.props.selectedDevices.mic;
        } else if (this.props.localMedia.getAudioTracks().length !== 0) {
            mic.label = this.props.localMedia.getAudioTracks()[0].label;
        }

        this.state = {
            camera: camera,
            showDrawer: false,
            mic: mic
        }
        this.devices = [];

        // ES6 classes no longer autobind
        this.hangupCall = this.hangupCall.bind(this);
        this.localVideoElementPlaying = this.localVideoElementPlaying.bind(this);
        this.toggleDrawer = this.toggleDrawer.bind(this);
        this.setDevice = this.setDevice.bind(this);
    }

    componentDidMount() {
        this.refs.localVideo.addEventListener('playing', this.localVideoElementPlaying);
        sylkrtc.utils.attachMediaStream(this.props.localMedia, this.refs.localVideo, {disableContextMenu: true});

        navigator.mediaDevices.enumerateDevices()
            .then((devices) => {
                this.devices = devices;

                let newState = {};
                if (this.state.camera.label !== 'No Camera') {
                    if (!devices.find((device) => {return device.kind === 'videoinput'})) {
                        newState.camera = {label: 'No Camera'};
                    } else if (this.props.localMedia.getVideoTracks().length !== 0) {
                        newState.camera = {label: this.props.localMedia.getVideoTracks()[0].label};
                    }
                }

                if (this.state.mic.label !== 'No mic') {
                    if (!devices.find((device) => {return device.kind === 'audioinput'})) {
                        newState.mic = {label: 'No mic'};
                    } else if (this.props.localMedia.getAudioTracks().length !== 0) {
                        newState.mic = { label: this.props.localMedia.getAudioTracks()[0].label};
                    }
                }

                if (Object.keys(newState).length != 0) {
                    this.setState(Object.assign({},newState));
                }
            })
            .catch(function(error) {
                DEBUG('Device enumeration failed: %o', error);
            });
    }

    componentWillReceiveProps(nextProps) {
        if (nextProps.localMedia !== this.props.localMedia) {
            sylkrtc.utils.attachMediaStream(nextProps.localMedia, this.refs.localVideo, {disableContextMenu: true});
        }

        if (nextProps.selectedDevices !== this.props.selectedDevices) {
            let camera = {label: 'No Camera'};
            let mic = {label: 'No Mic'};
            if ('camera' in nextProps.selectedDevices) {
                camera = nextProps.selectedDevices.camera;
            }

            if ('mic' in nextProps.selectedDevices) {
                mic = nextProps.selectedDevices.mic;
            }
            this.setState({camera: camera, mic: mic});
        }
    }

    componentWillUnmount() {
        this.refs.localVideo.removeEventListener('playing', this.localVideoElementPlaying);
    }

    setDevice = (device) => (e) => {
        e.preventDefault();
        if (device.label !== this.state.mic.label && device.label !== this.state.camera.label) {
            this.props.setDevice(device);
        }
    }
    
    localVideoElementPlaying() {
        this.refs.localVideo.removeEventListener('playing', this.localVideoElementPlaying);
    }

    hangupCall(event) {
        event.preventDefault();
        this.props.hangupCall();
    }

    toggleDrawer() {
        this.setState({showDrawer: !this.state.showDrawer});
    }

    render() {
        const localVideoClasses = classNames({
            'large'    : true,
            'animated' : true,
            'fadeIn'   : true,
            'mirror'   : true
        });
        const textClasses = classNames({
            'lead'          : true
        });
        const commonButtonTopClasses = classNames({
            'btn'           : true,
            'btn-link'      : true
        });
        const containerClasses = classNames({
            'video-container': true,
            'drawer-visible': this.state.showDrawer
        });
        const iconClasses = classNames({
            'video-icon': true,
            'drawer-visible': this.state.showDrawer
        })

        let cameras = [];
        let mics = [];

        this.devices.forEach((device) => {
            if (device.kind === 'videoinput') {
                cameras.push(
                    <ListGroupItem key={device.deviceId} style={{width: '350px'}} onClick={this.setDevice(device)} active={device.label === this.state.camera.label}>
                    {device.label}
                    </ListGroupItem>
                );
            } else if (device.kind === 'audioinput') {
                mics.push(
                    <ListGroupItem key={device.deviceId} style={{width: '350px'}} onClick={this.setDevice(device)} active={device.label === this.state.mic.label}>
                    {device.label}
                    </ListGroupItem>
                );
            }
        });
        const topButtons = [];

        if (!this.state.showDrawer) {
            topButtons.push(<button key="sbButton" type="button" title="Open Drawer" className={commonButtonTopClasses} onClick={this.toggleDrawer}> <i className="fa fa-bars fa-2x"></i> </button>);
        }

        let header = '';
        if (this.state.camera !== '') {
            header = (
                <CSSTransition
                    key="header-container"
                    classNames="videoheader"
                    timeout={{ enter: 300, exit: 300}}
                >
                    <div key="header-container">
                        <div key="header" className="call-header">
                            <div className="container-fluid" style={{position: 'relative'}}>
                                <p className={textClasses}><strong>Preview</strong></p>
                                <p className={textClasses}>{this.state.camera.label}</p>
                                <div className="conference-top-buttons">
                                    {topButtons}
                                </div>
                            </div>
                        </div>
                        <VolumeBar localMedia={this.props.localMedia} />
                    </div>
                </CSSTransition>
            );
        }

        let icon = '';
        if (this.state.camera.label === 'No Camera') {
            icon = (
                <div className={iconClasses}>
                    <p><i className="fa fa-video-camera-slash fa-5 fa-fw"></i></p>
                    <p className="lead">No camera detected</p>
                </div>
            );
        }

        return (
            <div>
                {icon}
                <div className={containerClasses} ref="videoContainer">
                    <div className="top-overlay">
                        <TransitionGroup>
                            {header}
                        </TransitionGroup>
                    </div>
                    <video className={localVideoClasses} id="localVideo" ref="localVideo" autoPlay muted />
                    <div className="call-buttons">
                        <button key="hangupButton" type="button" className="btn btn-round-big btn-danger" onClick={this.hangupCall}> <i className="fa fa-power-off"></i> </button>
                    </div>
                </div>
                <ConferenceDrawer show={this.state.showDrawer} close={this.toggleDrawer}>
                    <div>
                        <h4 className="header">Video Camera</h4>
                        <ListGroup>
                            {cameras}
                        </ListGroup>
                        <h4 className="header">Audio Input</h4>
                        <ListGroup>
                            {mics}
                        </ListGroup>
                    </div>
                </ConferenceDrawer>
            </div>
        );
    }
}

Preview.propTypes = {
    hangupCall: PropTypes.func,
    localMedia: PropTypes.object.isRequired,
    setDevice: PropTypes.func.isRequired,
    selectedDevices: PropTypes.object.isRequired
};

module.exports = Preview;
