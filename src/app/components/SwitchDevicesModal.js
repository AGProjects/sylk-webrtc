
'use strict';

const React          = require('react');
const {useEffect, useState, useRef}          = React;
const PropTypes      = require('prop-types');
const { makeStyles} = require('@material-ui/core/styles');
const { Dialog, DialogTitle, DialogContent, DialogActions }  = require('@material-ui/core');
const { FormControl,InputLabel, Select, MenuItem, Grid, Fade, CircularProgress} = require('@material-ui/core');
const VolumeBar = require('./VolumeBar')
const sylkrtc               = require('sylkrtc');

const { Button, InputBase } = require('../MaterialUIAsBootstrap');

const debug = require('debug');
const DEBUG = debug('blinkrtc:SwitchDevicesModal');

const { default: clsx }     = require('clsx');


const styleSheet = makeStyles((theme) => ({
    bigger: {
        '&> h2': {
            fontSize: '20px'
        }
    },
    formControl: {
        margin: theme.spacing(1),
        fontSize: '14px',
        textAlign: 'left'
    },
    inputLabel: {
        fontSize: '14px',
        transform: 'translate(0, 1.5px) scale(1) !important'
    },
    focused: {
        color: '#337ab7 !important'
    },
    scale: {
        transform: 'scale(-1, 1) !important',
        width: '100%',
        borderRadius: '5px',
        display: 'block'
    },
    select: {
        minHeight: 0
    },
    icon: {
        fontSize: '24px'
    },
    videoOverlay: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: 'rgb(200,200,200)',
        zIndex: 1,
        boderRadius: '5px'
    },
    pending: {
        alignItems: 'center',
        display: 'flex',
        height: '100%',
        justifyContent: 'center',
        position: 'absolute',
        width: '100%',
        zIndex: 2
    },
    failedText: {
        fontSize: 14,
        color: 'rgba(0, 0, 0, 0.87)'
    }
}));

const SwitchDevicesModal = (props) => {
    const classes = styleSheet();
    const [devices, setDevices] = useState([]);
    const [stream, setStream] = useState(null);
    const [audioStream, setAudioStream] = useState(props.call.getLocalStreams()[0]);
    const [videoInput, setVideoInput] = useState('');
    const [audioInput, setAudioInput] = useState('');
    const [audioOutput, setAudioOutput] = useState('');
    const [videoError, setVideoError] = useState(false);
    const previousVideoInput = useRef();
    const previousAudioInput = useRef();
    const video = useRef();
    const init = useRef();

    const currentStream = props.call.getLocalStreams()[0];

    useEffect(() => {
        if (props.show === true) {
            init.current = false;
            getDevices();
        }

        if (init.current === true && !props.show) {
            DEBUG('Closing stream: %o', stream);
            sylkrtc.utils.closeMediaStream(stream);
            init.current = false;
            setStream(null);
            setDevices([]);
            setVideoInput('');
            setAudioInput('');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.show]);

    useEffect(() => {
        if (init.current == true && (videoInput !== '' || audioInput !== '')) {
           getMedia();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [videoInput, audioInput]);

    useEffect(() => {
        if (devices.length != 0) {
            let currentLabel;
            if (currentStream.getVideoTracks().length !== 0) {
                currentLabel = currentStream.getVideoTracks()[0].label;
                let device = devices.find(device => device.label === currentLabel);
                if (device) {
                    setVideoInput(device.deviceId);
                    previousVideoInput.current = device.deviceId;
                }
            }

            currentLabel = currentStream.getAudioTracks()[0].label;
            let audioInput = devices.find(device => device.label === currentLabel);
            setAudioInput(audioInput.deviceId);
            previousAudioInput.current = audioInput.deviceId;
            init.current = true
        }
    }, [devices, currentStream]);

    const isFirefox = () => {
        return navigator.userAgent.indexOf('Firefox') > 0
    }

    const purgeTrack = (track) => {
        track.stop();
        stream.removeTrack(track);
    }

    const getDevices = () => {
        DEBUG('Getting available devices');
        const isSafari = navigator.vendor && navigator.vendor.indexOf('Apple') > -1 &&
        navigator.userAgent &&
        navigator.userAgent.indexOf('CriOS') == -1 &&
        navigator.userAgent.indexOf('FxiOS') == -1;

        new Promise((resolve, reject) => {
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
            })
            .catch(function(error) {
                DEBUG('Device enumeration failed: %o', error);
            });
    }

    const getMedia = () => {
        DEBUG('Getting media');
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

        if (isFirefox()) {
            constraints.video = {
                'width': {
                    'ideal': 640
                },
                'height': {
                    'ideal': 480
                }
            }
        }

        if (!stream) {
            constraints.audio = false;
            constraints.video = {
                deviceId: {
                    exact: videoInput
                }
            };
        }

        if (videoInput !== previousVideoInput.current && videoInput !== '') {
            previousVideoInput.current = videoInput;
            DEBUG('Video selection has changed, getting new track');
            constraints.video = {
                deviceId: {
                    exact: videoInput
                }
            };
            if (stream) {
                for (let track of stream.getVideoTracks()) {
                    purgeTrack(track);
                }
                constraints.audio = false;
            }
        }

        if (audioInput !== previousAudioInput.current) {
            previousAudioInput.current = audioInput
            DEBUG('Audio selection has changed, getting new track');
            if (videoInput !== '') {
                constraints.video = false;
            }
            constraints.audio = {
                deviceId: {
                    exact: audioInput
                }
            };
            if (stream) {
                for (let track of stream.getAudioTracks()) {
                    purgeTrack(track);
                }
            }
        }

        DEBUG('Final contraints: %o', constraints);

        navigator.mediaDevices.getUserMedia(constraints)
            .then((mediaStream) => {
                if (stream) {
                    if (mediaStream.getVideoTracks().length !== 0) {
                        stream.addTrack(mediaStream.getVideoTracks()[0]);
                    }
                    if (mediaStream.getAudioTracks().length !== 0) {
                        stream.addTrack(mediaStream.getAudioTracks()[0]);
                        setAudioStream(mediaStream)
                    }
                } else {
                    sylkrtc.utils.attachMediaStream(mediaStream, video.current, {muted: true, disableContextMenu: true, mirror: true});
                    setStream(mediaStream)
                }
                setVideoError(false);
            })
            .catch((error) => {
                DEBUG('Device had a problem: %o', error);
                if (!stream || !stream.getVideoTracks()[0]) {
                    setVideoError(true);
                }
            });
    }

    const getVideoInputDevices = () => {
        let videodevices = devices.filter(
            (device) => device.kind === 'videoinput').map(
                device => {
                    return (<MenuItem value={device.deviceId} key={device.deviceId}>{device.label}</MenuItem>)
                });
        return videodevices;
    }

    const getAudioInputDevices = () => {
        let audioDevices = devices.filter(
            (device) => device.kind === 'audioinput').map(
                device => {
                    return (<MenuItem value={device.deviceId} key={device.deviceId}>{device.label}</MenuItem>)
                });
        return audioDevices;
    }

    const getAudioOutputDevices = () => {
        let outputDevices = devices.filter(
            (device) => device.kind === 'audiooutput').map(
                device => {
                    return (<MenuItem value={device.deviceId} key={device.deviceId}>{device.label}</MenuItem>)
                });
        return outputDevices;
    }

    const selectVideoInput = (device) => {
        setVideoInput(device.target.value)
    }

    const selectAudioInput = (device) => {
        setAudioInput(device.target.value)
    }

    const selectOutput = (device) => {
        setAudioOutput(device.target.value)
    }

    const isCurrentVideoDevice = () => {
        let currentVideo = currentStream.getVideoTracks()[0].label;
        let selectedVideo = stream.getVideoTracks()[0].label;
        return selectedVideo === currentVideo;
    }

    const isCurrentAudioDevice = () => {
        let currentAudio = currentStream.getAudioTracks()[0].label;
        let selectedAudio;
        if (stream && stream.getAudioTracks().length !== 0) {
            selectedAudio = stream.getAudioTracks()[0].label;
        }
        if (isFirefox) {
            return true;
        }
        return selectedAudio === currentAudio;
    }

    const applyConstraints = () => {
        if (videoInput !== '' && !videoError && !isCurrentVideoDevice()) {
            DEBUG('Switching videoInput');
            props.call.replaceTrack(
                currentStream.getVideoTracks()[0],
                stream.getVideoTracks()[0].clone(),
                false
            );
            let device = devices.find(device => device.deviceId === videoInput);
            if (device) {
                props.setDevice(device);
            }
        }
        if (audioInput !== '' && !isCurrentAudioDevice()) {
            DEBUG('Switching audioInput');
            props.call.replaceTrack(
                currentStream.getAudioTracks()[0],
                stream.getAudioTracks()[0].clone(),
                false
            )
            let device = devices.find(device => device.deviceId === audioInput);
            if (device) {
                props.setDevice(device);
            }
            sylkrtc.utils.closeMediaStream(audioStream);
        }
        props.close();
    }

    return (
        <Dialog
            open={props.show}
            onClose={props.close}
            maxWidth="sm"
            fullWidth={true}
            aria-labelledby="dialog-title"
        >
            <DialogTitle id="dialog-title" className={classes.bigger}>Switch Devices</DialogTitle>
            <DialogContent dividers>
                {devices.length >= 1 ? (
                    <Grid container spacing={3}>
                        <Grid item xs={12} sm={6}>
                            <div>
                                <div style={{position: 'relative'}}>
                                    {videoError &&
                                        <div className={classes.videoOverlay}>
                                            <div className={clsx(classes.pending, classes.failedText)}>Camera unavailable</div>
                                        </div>
                                    }
                                    <video className={classes.scale} id="localVideo" ref={video} autoPlay muted/>
                                </div>
                                <br />
                                {audioStream && <VolumeBar localMedia={audioStream} style={{borderRadius: '5px'}} />}
                            </div>
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <FormControl className={classes.formControl} fullWidth disabled={props.disableCameraSelection}>
                                <InputLabel className={classes.inputLabel} classes={{focused: classes.focused}} id="camera-label" shrink>Camera</InputLabel>
                                <Select
                                    labelId="camera-label"
                                    value={videoInput}
                                    onChange={selectVideoInput}
                                    input={<InputBase />}
                                    classes={{selectMenu: classes.select, icon: classes.icon}}
                                    MenuProps={{
                                        anchorOrigin: {
                                            vertical: 'bottom',
                                            horizontal: 'left'
                                        },
                                        getContentAnchorEl: null
                                    }}
                                >
                                    {getVideoInputDevices()}
                                </Select>
                            </FormControl>
                            <FormControl className={classes.formControl} fullWidth disabled={isFirefox()} >
                                <InputLabel className={classes.inputLabel} classes={{focused: classes.focused}} id="mic-label" shrink>Microphone</InputLabel>
                                <Select
                                    labelId="mic-label"
                                    value={audioInput}
                                    onChange={selectAudioInput}
                                    input={<InputBase />}
                                    classes={{selectMenu: classes.select, icon: classes.icon}}
                                    MenuProps={{
                                        anchorOrigin: {
                                            vertical: 'bottom',
                                            horizontal: 'left'
                                        },
                                        getContentAnchorEl: null
                                    }}
                                >
                                    {getAudioInputDevices()}
                                </Select>
                            </FormControl>
                            {props.showOutput && getAudioOutputDevices().length >= 1 &&
                                <FormControl className={classes.formControl} fullWidth>
                                    <InputLabel className={classes.inputLabel} classes={{focused: classes.focused}} id="output-label" shrink>Output</InputLabel>
                                    <Select
                                        labelId="output-label"
                                        value={audioOutput}
                                        onChange={selectOutput}
                                        input={<InputBase />}
                                        classes={{selectMenu: classes.select, icon: classes.icon}}
                                        MenuProps={{
                                            anchorOrigin: {
                                                vertical: 'bottom',
                                                horizontal: 'left'
                                            },
                                            getContentAnchorEl: null
                                        }}
                                    >
                                        {getAudioOutputDevices()}
                                    </Select>
                                </FormControl>
                            }
                        </Grid>
                    </Grid>
                ) : (
                    <Fade
                        in={devices.length === 0}
                        style={{
                            transitionDelay: devices.length === 0 ? '100ms' : '0ms',
                            color: '#666',
                            width: '100px',
                            height: '100px'

                        }}
                        // unmountOnExit
                    >
                        <CircularProgress />
                    </Fade>
                )}
            </DialogContent>
            <DialogActions>
                <Button variant="contained" onClick={applyConstraints} title="apply">Ok</Button>
                <Button onClick={props.close} variant="text" title="cancel">Cancel</Button>
            </DialogActions>
        </Dialog>
    );
}

SwitchDevicesModal.propTypes = {
    show: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired,
    call: PropTypes.object.isRequired,
    setDevice: PropTypes.func.isRequired,
    showOutput: PropTypes.bool,
    disableCameraSelection: PropTypes.bool
};


module.exports = SwitchDevicesModal;
