
'use strict';

const React         = require('react');
const {useEffect, useState, useRef} = React;
const debug         = require('debug');
const sylkrtc       = require('sylkrtc');
const PropTypes      = require('prop-types');
const { makeStyles } = require('@material-ui/core/styles');
const { ListSubheader, ListItemIcon } = require('@material-ui/core');
const { Menu, MenuItem, Fade, CircularProgress } = require('@material-ui/core');

const AudioMenuItem = require('./SwitchDevicesMenu/AudioMenuItem')
const VideoMenuItem = require('./SwitchDevicesMenu/VideoMenuItem')
const { Queue }     = require('../utils');

const DEBUG = debug('blinkrtc:SwitchDevicesMenu');


const styleSheet = makeStyles((theme) => ({
    paper: {
        marginLeft: props => props.direction === 'right' ? '5px' : '',
        marginTop: props => props.direction !== 'right' ? '5px' : '',
        width: '272px'
    },
    item: {
        fontSize: '14px',
        fontFamily: 'inherit',
        color: '#333',
        minHeight: 0,
        lineHeight: '30px',
        margin: '4px 0'
    },
    audioLabel: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        paddingLeft: '20px',
        flex: 3
    },
    subheader: {
        textAlign: 'left',
        fontFamily: 'inherit',
        fontWeight: 700,
        fontSize: '14px'
    },
    icon: {
        minWidth: '20px'
    },
    selected: {
        color: '#fff',
        backgroundColor: '#337ab7 !important',
        '&:hover' : {
            backgroundColor: 'rgba(0,0,0, .04) !important',
            color: '#000'
        }
    }
}));

const SwitchDevicesMenu = (props) => {
    const classes = styleSheet(props);
    const [devices, setDevices] = useState([]);
    const [videoInput, setVideoInput] = useState('');
    const [audioInput, setAudioInput] = useState('');
    const [audioOutput, setAudioOutput] = useState('');
    const [mediaStreams, setMediaStreams] = useState({});

    const init = useRef(false);

    const currentStream = props.call.getLocalStreams()[0];

    useEffect(() => {
        if (props.show === true) {
            start();
        }

        if (init.current === true && !props.show) {
            Object.keys(mediaStreams).forEach((key) => {
                if (mediaStreams[key] !== 'failed') {
                    DEBUG('Closing stream: %o', mediaStreams[key]);
                    sylkrtc.utils.closeMediaStream(mediaStreams[key]);
                }
            });
            init.current = false;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.show])

    useEffect(() => {
        if (init.current == true && (videoInput !== '' || audioInput !== '')) {
            applyConstraints();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoInput, audioInput])

    useEffect(() => {
        if (devices.length != 0) {
            let currentLabel
            if (currentStream.getVideoTracks().length !== 0) {
                currentLabel = currentStream.getVideoTracks()[0].label;
                let device = devices.find(device => device.label === currentLabel);
                if (device) {
                    setVideoInput(device.deviceId);
                }
            }

            currentLabel = currentStream.getAudioTracks()[0].label;
            let audioInput = devices.find(device => device.label === currentLabel);
            if (audioInput) {
                setAudioInput(audioInput.deviceId);
            }

            setImmediate(() => init.current = true);
        }
    }, [devices, currentStream])

    const start = () => {
        DEBUG('Getting available devices');
        let constraints = {
            audio: true,
            video : {
                'width': {
                    'ideal': 1280
                },
                'height': {
                    'ideal': 720
                }
            }
        };

        if (navigator.userAgent.indexOf('Firefox') > 0) {
            constraints.video = {
                'width': {
                    'ideal': 640
                },
                'height': {
                    'ideal': 480
                }
            }
        }

        const isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
        navigator.userAgent &&
        navigator.userAgent.indexOf('CriOS') == -1 &&
        navigator.userAgent.indexOf('FxiOS') == -1;

        const promises = [];
        return new Promise((resolve, reject) => {
            if (isSafari) {
                return navigator.mediaDevices.getUserMedia(constraints)
                    .then((stream) => {
                        sylkrtc.utils.closeMediaStream(stream);
                        resolve();
                    }).catch((error) => {
                        DEBUG('Intial access failed: %o', error);
                        resolve();
                    });
            }
            resolve();
        })
            .then(() => {
                return navigator.mediaDevices.enumerateDevices();
            })
            .then((devices) => {
                DEBUG('We got the devices: %o', devices);
                setDevices(devices);
                return devices;
            })
            .catch((error) => {
                DEBUG('Device enumeration failed: %o', error);
            }).then((devices) => {
                devices.forEach((device) => {
                    if (!props.audio && device.kind === 'videoinput') {
                        constraints.video = {
                            deviceId: {
                                exact: device.deviceId
                            }
                        };
                        constraints.audio = false;
                        const newConstraints = Object.assign({}, constraints);
                        promises.push(
                            Queue.enqueue(
                                () => new Promise((resolve, reject) =>
                                    navigator.mediaDevices.getUserMedia(newConstraints)
                                    .then(stream => resolve({[newConstraints.video.deviceId.exact]: stream}))
                                    .catch((error) => resolve({[newConstraints.video.deviceId.exact]: error}))
                                )
                            )
                        );
                    } else if (props.audio && device.kind === 'audioinput') {
                        constraints.audio = {
                            deviceId: {
                                exact: device.deviceId
                            }
                        };
                        constraints.video = false;
                        const newConstraints = Object.assign({}, constraints);
                        promises.push(
                            Queue.enqueue(
                                () => new Promise((resolve, reject) =>
                                    navigator.mediaDevices.getUserMedia(newConstraints)
                                    .then(stream => resolve({[newConstraints.audio.deviceId.exact]: stream}))
                                    .catch((error) => resolve({[newConstraints.audio.deviceId.exact]: error}))
                                )
                            )
                        );
                    }
                });
                return Promise.all(promises)
            }).then((localStreams) => {
                DEBUG('We have all available streams from the devices: %o', localStreams);
                let streams = {};
                localStreams.forEach((stream) => {
                    Object.assign(streams, stream);
                    let key = Object.keys(stream)[0];
                    if (stream[key].name) {
                        DEBUG('Device had a problem: %o', stream[key]);
                        streams[key] = 'failed';
                    }
                })
                setMediaStreams(streams);
            });
    }

    const getVideoInputDevices = () => {
        const videodevices = devices.filter(
            (device) => device.kind === 'videoinput').map(
                device => {
                        const id = device.deviceId;
                        return (
                            <MenuItem
                                onClick={
                                    () => mediaStreams[id] && mediaStreams[id] !== 'failed' && selectVideoInput(device)
                                }
                                value={id}
                                key={id}
                                disabled={mediaStreams[id] === 'failed'}
                            >
                                <VideoMenuItem stream={mediaStreams[device.deviceId]} label={device.label} selected={id === videoInput} />
                            </MenuItem>
                        )
                }
            );
        return videodevices;
    }

    const getAudioInputDevices = () => {
        const audioDevices = devices.filter(
            (device) => device.kind === 'audioinput').map(
                device => {
                    const id = device.deviceId;
                    return (
                        <MenuItem
                            onClick={
                                () => mediaStreams[id] && mediaStreams[id] !== 'failed' && selectAudioInput(device)
                            }
                            key={id}
                            className={classes.item}
                            classes={{selected: classes.selected}}
                            selected={id === audioInput}
                            title={device.label}
                            disabled={mediaStreams[id] === 'failed'}
                        >
                            <AudioMenuItem label={device.label} stream={mediaStreams[id]} selected={id === audioInput}/>
                        </MenuItem>)
                });
        return audioDevices;
    }

    const getAudioOutputDevices = () => {
        let outputDevices = devices.filter(
            (device) => device.kind === 'audiooutput').map(
                device => {
                    return (
                        <MenuItem
                            onClick={() => selectAudioOutput(device.deviceId)}
                            value={device.deviceId}
                            key={device.deviceId}
                            className={classes.item}
                        >
                            <div className={classes.audioLabel}>{device.label}</div>
                        </MenuItem>
                    )
                });
        return outputDevices;
    }

    const selectVideoInput = (device) => {
        setVideoInput(device.deviceId)
        if (videoInput === device.deviceId) {
            props.close();
        }
        props.setDevice(device);
    }

    const selectAudioInput = (device) => {
        setAudioInput(device.deviceId);
        props.setDevice(device);
    }

    const selectAudioOutput = (device) => {
        // props.setSink(device)
        props.close()
    }

    const isCurrentVideoDevice = () => {
        let currentVideo = currentStream.getVideoTracks()[0].label;
        let selectedVideo = mediaStreams[videoInput].getVideoTracks()[0].label;
        return selectedVideo === currentVideo;
    }

    const isCurrentAudioDevice = () => {
        let currentVideo = currentStream.getAudioTracks()[0].label;
        let selectedVideo = mediaStreams[audioInput].getAudioTracks()[0].label;
        return selectedVideo === currentVideo;
    }

    const applyConstraints = () => {
        if (!props.audio && videoInput !== '') {
            if (!isCurrentVideoDevice()) {
                DEBUG('Switching videoInput');
                props.call.replaceTrack(
                    currentStream.getVideoTracks()[0],
                    mediaStreams[videoInput].getVideoTracks()[0].clone(),
                    false
                );
            }
            props.close()
        }
        if (props.audio && audioInput !== '' && !isCurrentAudioDevice()) {
            DEBUG('Switching audioInput');
            props.call.replaceTrack(
                currentStream.getAudioTracks()[0],
                mediaStreams[audioInput].getAudioTracks()[0].clone(),
                false
            );
        }
    }

    return (
        <div>
            <Menu
                id="conference-menu"
                anchorEl={props.anchor}
                open={props.show}
                onClose={props.close}
                classes={{paper: classes.paper}}
                anchorOrigin={{
                    vertical: props.direction && props.direction === 'right' ? 'top' : 'bottom',
                    horizontal: props.direction && props.direction === 'right' ? 'right' : 'center'
                }}
                transformOrigin={{
                    // vertical: props.direction && props.direction === 'right' ? 'center' : 'top',
                    vertical: 'top',
                    horizontal: props.direction && props.direction === 'right' ? 'left' : 'center'
                }}
                getContentAnchorEl={null}
            >
                {devices.length >= 1 ? (
                    <div>
                    {props.audio && (
                        <ListSubheader
                            key="audio-title"
                            className={classes.subheader}
                        >
                        <ListItemIcon className={classes.icon}>
                        <i className="fa fa-microphone"></i>
                        </ListItemIcon>
                        Microphones
                        </ListSubheader>
                    )}

                    {props.audio && getAudioInputDevices()}

                    {props.showOutput && (
                        <ListSubheader
                            key="output-title"
                            className={classes.subheader}
                        >
                        <ListItemIcon className={classes.icon}>
                        <i className="fa fa-volume-up"></i>
                        </ListItemIcon>
                        Speakers
                        </ListSubheader>
                    )}
                    {props.showOutput && getAudioOutputDevices()}

                    {!props.audio && getVideoInputDevices()}
                    </div>
                ) : (
                    <Fade
                        in={devices.length === 0}
                        style={{
                            transitionDelay: devices.length === 0 ? '100ms' : '0ms',
                            color: '#666'
                        }}
                        unmountOnExit
                    >
                        <CircularProgress />
                    </Fade>
                )}
            </Menu>
        </div>
    );
}

SwitchDevicesMenu.propTypes = {
    show: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired,
    call: PropTypes.object.isRequired,
    setDevice: PropTypes.func.isRequired,
    anchor: PropTypes.object,
    audio: PropTypes.bool,
    showOutput: PropTypes.bool,
    direction: PropTypes.string
};


module.exports = SwitchDevicesMenu;
