import React, { useState, useEffect, useRef, useCallback } from 'react';
import clsx from 'clsx';

import { makeStyles } from '@material-ui/core/styles';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    IconButton,
    CircularProgress,
    Typography
} from '@material-ui/core';
import { Button } from '../MaterialUIAsBootstrap';
import { useAddressbook } from '../AddressbookProvider';

import { Contact } from '../types/Contact';

import CameraSelectMenu from './CameraSelectMenu';

interface SwitchToVideoCallModelProps {
    contact: Contact;
    show: boolean;
    close: () => void;
    onConfirm: (stream?: MediaStream) => void;
    promptText?: string;
}

const styleSheet = makeStyles({
    bigger: {
        '&> h2': {
            fontSize: '20px'
        },
        '&> div > p ': {
            fontSize: '14px'
        }
    },
    fixFont: {
        fontFamily: 'inherit',
        fontSize: '14px',
        textAlign: 'left'
    },
    darkerText: {
        color: '#333'
    },
    previewWrapper: {
        position: 'relative',
        width: '100%',
        paddingTop: '56.25%', // 16:9
        backgroundColor: '#000',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 16
    },
    previewVideo: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    },
    previewOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#fff',
        backgroundColor: 'rgba(0, 0, 0, 0.35)'
    },
    cameraButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: '36px',
        height: '36px',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        color: '#333',
        '&:hover': {
            backgroundColor: '#fff'
        }
    }
});

const SwitchToVideoCallModel = ({ show, close, contact, onConfirm, promptText }: SwitchToVideoCallModelProps) => {
    const classes = styleSheet();
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [cameraMenuAnchor, setCameraMenuAnchor] = useState<HTMLElement | null>(null);
    const showCameraMenu = Boolean(cameraMenuAnchor);

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const startPreview = useCallback(async (deviceId?: string) => {
        setLoading(true);
        setError(null);
        stopStream();
        try {
            const constraints: MediaStreamConstraints = {
                audio: false,
                video: deviceId ? { deviceId: { exact: deviceId } } : true
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }

            // Device labels are only populated once permission has been granted,
            // so (re)enumerate after the getUserMedia call succeeds.
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = allDevices.filter((d) => d.kind === 'videoinput');
            setDevices(videoInputs);

            const activeTrack = stream.getVideoTracks()[0];
            const activeDeviceId = activeTrack?.getSettings().deviceId;
            if (activeDeviceId) {
                setSelectedDeviceId(activeDeviceId);
            } else if (videoInputs.length > 0) {
                setSelectedDeviceId(videoInputs[0].deviceId);
            }
        } catch (e) {
            setError('Could not access your camera. Check your browser permissions and try again.');
        } finally {
            setLoading(false);
        }
    }, [stopStream]);

    useEffect(() => {
        if (show) {
            startPreview();
        } else {
            stopStream();
        }
        return () => {
            stopStream();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);


    const handleDeviceSelect = (device: MediaDeviceInfo) => {
        setSelectedDeviceId(device.deviceId);
        startPreview(device.deviceId);
    };

    const handleClose = () => {
        stopStream();
        close();
    };

    const handleConfirm = () => {
        const stream = streamRef.current;
        streamRef.current = null;
        onConfirm(stream || undefined);
    };

    return (
        <Dialog
            open={show}
            onClose={(event, reason) => {
                if (reason !== 'backdropClick') {
                    handleClose();
                }
            }}
            maxWidth="sm"
            fullWidth={true}
            aria-labelledby="dialog-titile"
            aria-describedby="dialog-description"
            disableEscapeKeyDown
        >
            <DialogTitle id="dialog-title" className={classes.bigger}>Enable your camera?</DialogTitle>
            <DialogContent dividers>
                <div className={classes.previewWrapper}>
                    <video
                        ref={videoRef}
                        className={classes.previewVideo}
                        autoPlay
                        muted
                        playsInline
                    />
                    {(loading || error) && (
                        <div className={classes.previewOverlay}>
                            {loading && <CircularProgress size={32} color="inherit" />}
                            {!loading && error && (
                                <Typography variant="body2" align="center" style={{ padding: '0 16px' }}>
                                    {error}
                                </Typography>
                            )}
                        </div>
                    )}

                    {devices.length > 1 && (
                        <IconButton
                            className={classes.cameraButton}
                            title="Select camera"
                            onClick={(event: React.MouseEvent<HTMLElement>) => setCameraMenuAnchor(event.currentTarget)}
                        >
                            <i className="fa fa-video-camera" />
                        </IconButton>
                    )}
                </div>
                <DialogContentText id="dialog-description" component="div" className={clsx(classes.fixFont, classes.darkerText)}>
                    <p>{promptText ?? `${contact?.name} has enabled the camera.`}<br />Do you also want to start the camera now, or stay audio-only and turn it on later?</p>
                </DialogContentText>


                <CameraSelectMenu
                    show={showCameraMenu}
                    anchor={cameraMenuAnchor}
                    close={() => setCameraMenuAnchor(null)}
                    devices={devices}
                    selectedDeviceId={selectedDeviceId}
                    onSelect={handleDeviceSelect}
                    direction="down"
                />
            </DialogContent>
            <DialogActions>
                <Button variant="text" onClick={close} title="close">
                    Audio only
                </Button>
                <Button
                    variant="contained"
                    onClick={handleConfirm}
                    title="Enable camera"
                    color="primary"
                    disabled={loading || !!error}
                >
                    Enable camera
                </Button>
            </DialogActions>
        </Dialog >
    );
}


export default SwitchToVideoCallModel;
