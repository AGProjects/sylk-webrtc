import React, { useEffect, useState } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions
} from '@material-ui/core';
import { Button } from '../MaterialUIAsBootstrap';
import zrtpStorage from '../zrtpStorage';


import debug from 'debug';


const DEBUG = debug('blinkrtc:zrtpStatus')

interface ZrtpStatusProps {
    call: any;
    onModalOpenChange?: (open: boolean) => void;
}

interface ZrtpStorageEntry {
        rs1:        number[];
        verified:   boolean;
        verifiedAt: string | null;
}

const styleSheet = makeStyles({
    bigger: {
        '&> h2': {
            fontSize: '20px'
        },
        '&> div > p': {
            fontSize: '14px'
        }
    },
    fixFont: {
        fontFamily: 'inherit',
        fontSize: '14px',
        textAlign: 'left'
    },
    sas: {
        fontFamily: 'monospace',
        fontSize: '22px',
        letterSpacing: '2px',
        textAlign: 'center',
        margin: '16px 0'
    },
    caveat: {
        fontFamily: 'inherit',
        fontSize: '12px',
        textAlign: 'left',
        opacity: 0.75,
        marginTop: '12px',
        marginBottom: 0
    },
    warning: {
        color: '#c62828',
        fontWeight: 'bold'
    }
});

// Keys are "uri:deviceId" under the current per-device rs1 scheme. Kept as
// a helper since it's built in three different handlers below and needs to
// stay consistent with how the startup loader parses these back apart.
function rs1StorageKey(uri: string, deviceId: string | null) {
    return `${uri}:${deviceId || ''}`;
}

const ZrtpStatus = ({ call, onModalOpenChange }: ZrtpStatusProps) => {
    const classes = styleSheet();
    const uri     = call?.remoteIdentity?.uri;

    const [sas, setSas]           = useState<string | null>(call?.zrtp?.sas || null);
    const [verified, setVerified] = useState(false);
    const [verifiedAt, setVerifiedAt] = useState<string | null>(null);
    const [mitm, setMitm]         = useState(false);
    const [open, changeOpen]         = useState(false);


    const setOpen = (value: boolean) => {
        changeOpen(value);
        onModalOpenChange?.(value);
    };

    useEffect(() => {
        if (!uri || !call?.zrtp) return;
        const peerDeviceId = call.zrtp.peerDeviceId;
        const rs1Key = rs1StorageKey(uri, peerDeviceId);
        zrtpStorage.get(rs1Key).then((entry: ZrtpStorageEntry | null) => {
            if (entry?.verified) {
                setVerified(true);
                setVerifiedAt(entry.verifiedAt);
            }
        });
    }, [uri, call]);

    useEffect(() => {
        if (!call?.zrtp) return;

        const onKeysReady = ({ sas }: { sas: string }) => {
            setSas(sas);
        };

        const onMitmDetected = ({ sas }: { sas: string }) => {
            setSas(sas);
            setMitm(true);
            setOpen(true);
        };

        // Session died after keys were derived (worker error, PC torn
        // down mid-call, etc.) - the lock must not keep claiming
        // encryption is active once the session is dead.
        const onStateChanged = (newState: string) => {
            DEBUG(newState)
            if (newState === 'failed') {
                setSas(null);
                setMitm(false);
                setOpen(false);
            }
        };

        const onRs1Update = ({ uri, device_id, rs1 }: { uri: string; device_id: string | null; rs1: number[] }) => {
            DEBUG('saving rs1 for uri=', uri, 'device=', device_id);
            const rs1Key = rs1StorageKey(uri, device_id);
            zrtpStorage.get(rs1Key).then((entry: ZrtpStorageEntry | null) => {
                const newEntry = {
                    rs1,
                    verified: entry?.verified || false,
                    verifiedAt: entry?.verifiedAt || null
                };

                zrtpStorage.add(rs1Key, newEntry);

                setVerified(newEntry.verified);
                setVerifiedAt(newEntry.verifiedAt);
            });
        };

        call.zrtp.on('keysReady',    onKeysReady);
        call.zrtp.on('mitmDetected', onMitmDetected);
        call.zrtp.on('rs1Update',    onRs1Update);
        call.on('zrtpStateChanged', onStateChanged);

        return () => {
            call.zrtp.off('keysReady',    onKeysReady);
            call.zrtp.off('mitmDetected', onMitmDetected);
            call.zrtp.off('rs1Update',    onRs1Update);
            call.off('zrtpStateChanged', onStateChanged);
        };
    }, [call, uri]);

    const handleVerify = () => {
        const now = new Date().toLocaleString();
        setVerified(true);
        setVerifiedAt(now);
        setOpen(false);
        const peerDeviceId = call.zrtp.peerDeviceId;
        const rs1Key = rs1StorageKey(uri, peerDeviceId);
        zrtpStorage.get(rs1Key).then((entry: ZrtpStorageEntry | null) => {
            zrtpStorage.add(rs1Key, {
                rs1:        entry?.rs1 || [],
                verified:   true,
                verifiedAt: now
            });
        });
    };

    const handleReset = () => {
        setVerified(false);
        setVerifiedAt(null);
        setOpen(false);
        // Goes through the session's own API rather than poking account
        // internals directly - it drops the in-memory rs1 for this peer
        // device and emits 'zrtpRs1Clear' for anyone else listening.
        call.zrtp.clearRs1();
        const peerDeviceId = call.zrtp.peerDeviceId;
        const rs1Key = rs1StorageKey(uri, peerDeviceId);
        zrtpStorage.remove(rs1Key);
    };

    if (!sas) return null;

    const lockColor = mitm ? '#c62828' : verified ? '#4cae4c' : '#e65100';
    const from      = call?.remoteIdentity?.displayName || uri || 'Your contact';

    return (
        <>
            <i
                className={`fa ${verified && !mitm ? 'fa-lock' : 'fa-lock'}`}
                style={{ color: lockColor, cursor: 'pointer', marginLeft: '6px' }}
                onClick={() => setOpen(true)}
                title={mitm ? 'Security warning' : verified ? 'End-to-end encrypted and verified' : 'End-to-end encrypted — tap to verify'}
            />

            {open && !mitm && (
                <Dialog
                    open
                    onClose={(_event, reason) => {
                        if (reason !== 'backdropClick') setOpen(false);
                    }}
                    maxWidth="sm"
                    fullWidth={true}
                    aria-labelledby="zrtp-sas-title"
                    aria-describedby="zrtp-sas-description"
                >
                    <DialogTitle id="zrtp-sas-title" className={classes.bigger}>
                        Call security
                    </DialogTitle>
                    <DialogContent dividers>
                        <DialogContentText id="zrtp-sas-description" component="div" className={classes.fixFont}>
                            <p>Read this code to <strong>{from}</strong> and ask them to confirm it matches their screen.</p>
                            <p className={classes.sas}>{sas}</p>
                            {verified && verifiedAt
                                ? <p className={classes.verifiedDate}>Verified on {verifiedAt}</p>
                                : <p className={classes.caveat}>
                                    If the codes match, your call is end-to-end encrypted and no one is listening in.
                                    If they don't match, end the call immediately.
                                  </p>
                            }
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <div>
                            {verified &&
                                <Button onClick={handleReset} variant="text" title="Reset verification">
                                    Reset
                                </Button>
                            }
                        </div>
                        <div>
                            {!verified &&
                                <Button onClick={() => setOpen(false)} variant="text" title="Close without verifying">
                                    Close
                                </Button>
                            }
                            {!verified &&
                                <Button onClick={handleVerify} variant="contained" title="Confirm codes match">
                                    Codes match
                                </Button>
                            }
                            {verified &&
                                <Button onClick={() => setOpen(false)} variant="contained" title="Close" autoFocus>
                                    Close
                                </Button>
                            }
                        </div> 
                    </DialogActions>
                </Dialog>
            )}

            {mitm && (
                <Dialog
                    open
                    onClose={() => {}}
                    maxWidth="sm"
                    fullWidth={true}
                    disableBackdropClick
                    disableEscapeKeyDown
                    aria-labelledby="zrtp-mitm-title"
                    aria-describedby="zrtp-mitm-description"
                >
                    <DialogTitle id="zrtp-mitm-title" className={classes.bigger}>
                        Security warning
                    </DialogTitle>
                    <DialogContent dividers>
                        <DialogContentText id="zrtp-mitm-description" component="div" className={classes.fixFont}>
                            <p className={classes.warning}>This call may be intercepted.</p>
                            <p>The security code does not match a previous call with <strong>{from}</strong>. Someone may be listening in.</p>
                            <p className={classes.caveat}>
                                End this call and contact the other party through a different channel to verify.
                            </p>
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={() => call.terminate()} variant="contained" title="End call">
                            End call
                        </Button>
                        <Button onClick={() => { setMitm(false); setOpen(false); }} variant="text" title="Dismiss and continue">
                            Continue anyway
                        </Button>
                    </DialogActions>
                </Dialog>
            )}
        </>
    );
};

export default ZrtpStatus;
