import React, { useEffect, useRef, useState, useCallback } from 'react';
import clsx from 'clsx';

import { makeStyles } from '@material-ui/core/styles';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    DialogContentText,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Typography
} from '@material-ui/core';

import { Button, InputBase } from '../MaterialUIAsBootstrap';
import { usePreferences } from '../PreferencesProvider';

interface PreferencesModalProps {
    show: boolean;
    close: () => void;
}

interface DeviceOption {
    deviceId: string;
    label: string;
}

const toDeviceOptions = (
    devices: MediaDeviceInfo[],
    kind: MediaDeviceKind,
    fallbackLabel: string
): DeviceOption[] =>
    devices
        .filter((d) => d.kind === kind)
        .map((d, i) => ({
            deviceId: d.deviceId,
            label: d.label || `${fallbackLabel} ${i + 1}`
        }));

const styleSheet = makeStyles((theme) => ({
    dialog: {
        '& .MuiTypography-root': { fontFamily: 'inherit' },
        '& .MuiInputBase-root': { fontFamily: 'inherit', fontSize: '14px' },
        '& .MuiInputLabel-root': { fontFamily: 'inherit', fontSize: '14px' },
        '& .MuiMenuItem-root': { fontFamily: 'inherit', fontSize: '14px' },
        '& .MuiButtonBase-root': { fontFamily: 'inherit' }
    },
    select: { minHeight: 0 },
    icon: { fontSize: '24px' },
    title: {
        '& > h2': { fontSize: '20px', fontFamily: 'inherit' }
    },
    fixFont: {
        fontFamily: 'inherit',
        fontSize: '14px',
        textAlign: 'left'
    },
    darkerText: { color: '#333' },
    section: { padding: theme.spacing(1.5, 0) },
    sectionTitle: {
        marginBottom: theme.spacing(1.5),
        fontFamily: 'inherit'
    },
    field: {
        width: '100%',
        marginBottom: theme.spacing(2)
    },
    loading: {
        display: 'flex',
        justifyContent: 'center',
        padding: theme.spacing(6)
    },
    error: { marginBottom: theme.spacing(1) },
    previewOuter: {
        width: '90%',
        margin: '0 auto',
        marginBottom: theme.spacing(2)
    },
    previewWrapper: {
        position: 'relative',
        width: '100%',
        paddingTop: '56.25%',
        backgroundColor: '#000',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: theme.spacing(2)
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
    zrtpButtons: {
        display: 'flex',
        gap: theme.spacing(1),
        marginTop: theme.spacing(1.5),
        '& > button': { flex: 1 }
    }
}));

const PreferencesModal = ({ show, close }: PreferencesModalProps) => {
    const classes = styleSheet();

    const {
        preferences,
        loading,
        zrtpSupported,
        updatePreferences,
        resetPreferences
    } = usePreferences();

    const [audioInputs, setAudioInputs] = useState<DeviceOption[]>([]);
    const [audioOutputs, setAudioOutputs] = useState<DeviceOption[]>([]);
    const [videoInputs, setVideoInputs] = useState<DeviceOption[]>([]);
    const [devicesError, setDevicesError] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const previewStreamRef = useRef<MediaStream | null>(null);

    const stopPreview = useCallback(() => {
        if (previewStreamRef.current) {
            previewStreamRef.current.getTracks().forEach((track) => track.stop());
            previewStreamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    const loadDevices = useCallback(async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const isRealDevice = (d: MediaDeviceInfo) =>
                d.deviceId !== 'default' && d.deviceId !== 'communications';

            setAudioInputs(toDeviceOptions(devices.filter(isRealDevice), 'audioinput', 'Microphone'));
            setAudioOutputs(toDeviceOptions(devices.filter(isRealDevice), 'audiooutput', 'Speaker'));
            setVideoInputs(toDeviceOptions(devices.filter(isRealDevice), 'videoinput', 'Camera'));

            setDevicesError(null);
        } catch (err) {
            setDevicesError('Could not read audio and video devices. Check browser permissions.');
        }
    }, []);

    const startPreview = useCallback(
        async (deviceId?: string) => {
            setPreviewLoading(true);
            setPreviewError(null);

            stopPreview();

            try {
                const constraints: MediaStreamConstraints = {
                    audio: false,
                    video: deviceId ? { deviceId: { exact: deviceId } } : true
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);

                previewStreamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }

                /*
                 * Permission has now been granted, so
                 * device labels should be available.
                 */
                await loadDevices();

                setPreviewError(null);
            } catch (err) {
                setPreviewError('Could not access your camera. Check your browser permissions and try again.');
            } finally {
                setPreviewLoading(false);
            }
        },
        [stopPreview, loadDevices]
    );

    useEffect(() => {
        if (!show) {
            return;
        }

        loadDevices();

        navigator.mediaDevices?.addEventListener?.('devicechange', loadDevices);

        return () => {
            navigator.mediaDevices?.removeEventListener?.('devicechange', loadDevices);
        };
    }, [show, loadDevices]);

    /*
     * Start the camera preview when the dialog opens.
     *
     * IMPORTANT:
     * videoInputDeviceId is intentionally not a dependency.
     *
     * When the user changes the Select we explicitly:
     *
     *   1. updatePreferences()
     *   2. startPreview()
     *
     * This prevents the Provider update from causing
     * another unnecessary camera restart.
     */
    useEffect(() => {
        if (!show) {
            stopPreview();
            return;
        }

        const deviceId = preferences.videoInputDeviceId === 'default' ? undefined : preferences.videoInputDeviceId;

        startPreview(deviceId);

        return () => {
            stopPreview();
        };

        // Only initialize/cleanup the preview when
        // the dialog opens or closes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

    const handleCameraChange = (event: React.ChangeEvent<{ name?: string; value: unknown }>) => {
        const deviceId = event.target.value as string;

        updatePreferences({ videoInputDeviceId: deviceId });

        startPreview(deviceId === 'default' ? undefined : deviceId);
    };

    return (
        <Dialog
            className={classes.dialog}
            open={show}
            onClose={(event, reason) => {
                if (reason !== 'backdropClick') {
                    close();
                }
            }}
            maxWidth="sm"
            fullWidth
            aria-labelledby="preferences-dialog-title"
            disableEscapeKeyDown
        >
            <DialogTitle id="preferences-dialog-title" className={classes.title}>
                Preferences
            </DialogTitle>

            <DialogContent dividers className={clsx(classes.fixFont, classes.darkerText)}>
                {loading ? (
                    <div className={classes.loading}>
                        <CircularProgress size={28} />
                    </div>
                ) : (
                    <>
                        {/* AUDIO */}
                        <div className={classes.section}>
                            <DialogContentText component="div" className={classes.fixFont}>
                                <div className={classes.sectionTitle}>Audio</div>
                            </DialogContentText>

                            {devicesError && (
                                <DialogContentText className={clsx(classes.fixFont, classes.error)}>
                                    {devicesError}
                                </DialogContentText>
                            )}

                            {audioInputs.length !== 0 && (
                                <FormControl className={classes.field} fullWidth>
                                    <InputLabel id="mic-label">Microphone</InputLabel>

                                    <Select
                                        labelId="mic-label"
                                        value={preferences.audioInputDeviceId}
                                        input={<InputBase />}
                                        classes={{ selectMenu: classes.select, icon: classes.icon }}
                                        onChange={(e) =>
                                            updatePreferences({ audioInputDeviceId: e.target.value as string })
                                        }
                                    >
                                        <MenuItem value="default">System default</MenuItem>

                                        {audioInputs.map((device) => (
                                            <MenuItem key={device.deviceId} value={device.deviceId}>
                                                {device.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}

                            {/* AUDIO OUTPUT (SPEAKER) — disabled
                            <FormControl className={classes.field} fullWidth>
                                <InputLabel id="speaker-label">Speaker</InputLabel>

                                <Select
                                    labelId="speaker-label"
                                    value={preferences.audioOutputDeviceId}
                                    input={<InputBase />}
                                    classes={{ selectMenu: classes.select, icon: classes.icon }}
                                    onChange={(e) =>
                                        updatePreferences({ audioOutputDeviceId: e.target.value as string })
                                    }
                                >
                                    <MenuItem value="default">System default</MenuItem>

                                    {audioOutputs.map((device) => (
                                        <MenuItem key={device.deviceId} value={device.deviceId}>
                                            {device.label}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            */}
                        </div>

                        <Divider />

                        {/* VIDEO */}
                        {videoInputs.length !== 0 && (
                            <div className={classes.section}>
                                <DialogContentText component="div" className={classes.fixFont}>
                                    <div className={classes.sectionTitle}>Video</div>
                                </DialogContentText>

                                <div className={classes.previewOuter}>
                                    <div className={classes.previewWrapper}>
                                        <video ref={videoRef} className={classes.previewVideo} autoPlay muted playsInline />

                                        {(previewLoading || previewError) && (
                                            <div className={classes.previewOverlay}>
                                                {previewLoading && <CircularProgress size={32} color="inherit" />}

                                                {!previewLoading && previewError && (
                                                    <Typography variant="body2" align="center" style={{ padding: '0 16px' }}>
                                                        {previewError}
                                                    </Typography>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <FormControl className={classes.field} fullWidth>
                                    <InputLabel id="camera-label">Camera</InputLabel>

                                    <Select
                                        labelId="camera-label"
                                        value={preferences.videoInputDeviceId}
                                        input={<InputBase />}
                                        classes={{ selectMenu: classes.select, icon: classes.icon }}
                                        onChange={handleCameraChange}
                                    >
                                        <MenuItem value="default">System default</MenuItem>

                                        {videoInputs.map((device) => (
                                            <MenuItem key={device.deviceId} value={device.deviceId}>
                                                {device.label || 'Camera'}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </div>
                        )}

                        <Divider />

                        {/* ZRTP */}
                        <div className={classes.section}>
                            <DialogContentText component="div" className={classes.fixFont}>
                                <div className={classes.sectionTitle}>zRTP E2E encryption</div>
                                <div>Choose whether zRTP E2E encryption is disabled, optional, or mandatory for calls.</div>
                            </DialogContentText>

                            <div className={classes.zrtpButtons}>
                                <Button
                                    variant={preferences.zrtpMode === 'off' ? 'contained' : 'outlined'}
                                    color={preferences.zrtpMode === 'off' ? 'primary' : undefined}
                                    onClick={() => updatePreferences({ zrtpMode: 'off' })}
                                    disabled={!zrtpSupported}
                                >
                                    Off
                                </Button>

                                <Button
                                    variant={preferences.zrtpMode === 'optional' ? 'contained' : 'outlined'}
                                    color={preferences.zrtpMode === 'optional' ? 'primary' : undefined}
                                    onClick={() => updatePreferences({ zrtpMode: 'optional' })}
                                    disabled={!zrtpSupported}
                                >
                                    Optional
                                </Button>

                                <Button
                                    variant={preferences.zrtpMode === 'mandatory' ? 'contained' : 'outlined'}
                                    color={preferences.zrtpMode === 'mandatory' ? 'primary' : undefined}
                                    onClick={() => updatePreferences({ zrtpMode: 'mandatory' })}
                                    disabled={!zrtpSupported}
                                >
                                    Mandatory
                                </Button>
                            </div>
                        </div>
                    </>
                )}
            </DialogContent>

            <DialogActions>
                <Button variant="outlined" onClick={resetPreferences}>
                    Reset to defaults
                </Button>

                <Button variant="contained" color="primary" onClick={close}>
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

PreferencesModal.displayName = 'PreferencesModal';

export default PreferencesModal;
