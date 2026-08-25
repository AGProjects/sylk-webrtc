import React from 'react';

import { makeStyles } from '@material-ui/core/styles';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions
} from '@material-ui/core';
import { Button } from '../MaterialUIAsBootstrap';

// Receiver-side prompt for an incoming "Please share your screen"
// request (the peer's in-call "Request screen" button). Mirrors
// sylk-mobile's ScreenShareRequestModal in wording and shape so the
// handshake reads the same on both ends.
//
// Accept -> app.js replies request_accept over the in-call
//           application/sylk-screen-sharing channel and runs the
//           ordinary switchScreensharing() path. Accepting here does
//           NOT bypass the source picker (Electron) or the browser's
//           own screen-capture prompt: this dialog is consent to be
//           *asked*, the picker is consent to actually capture.
// Reject -> app.js replies request_reject so the requester's button
//           leaves its pending state at once instead of waiting out the
//           60 s expiry.
//
// The auto-dismiss timer at the request's `expires` is owned by app.js,
// not by this component.

interface ScreenShareRequestModalProps {
    show: boolean;
    close: () => void;
    fromUri?: string | null;
    fromName?: string | null;
    onAccept?: () => void;
    onDecline?: () => void;
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
    caveat: {
        fontFamily: 'inherit',
        fontSize: '12px',
        textAlign: 'left',
        opacity: 0.75,
        marginTop: '12px',
        marginBottom: 0
    }
});

const ScreenShareRequestModal = ({
    show,
    close,
    fromUri,
    fromName,
    onAccept,
    onDecline
}: ScreenShareRequestModalProps) => {
    const classes = styleSheet();
    const from = fromName || fromUri || 'Your contact';

    const accept = () => {
        onAccept?.();
        close();
    };

    const decline = () => {
        onDecline?.();
        close();
    };

    return (
        <Dialog
            open={show}
            onClose={(event, reason) => {
                // A stray backdrop click must not count as a decision:
                // silently closing would leave the requester waiting out
                // the full expiry with no answer.
                if (reason !== 'backdropClick') {
                    decline();
                }
            }}
            maxWidth="sm"
            fullWidth={true}
            aria-labelledby="screen-share-request-title"
            aria-describedby="screen-share-request-description"
        >
            <DialogTitle id="screen-share-request-title" className={classes.bigger}>
                Share your screen
            </DialogTitle>
            <DialogContent dividers>
                <DialogContentText id="screen-share-request-description" component="div" className={classes.fixFont}>
                    <p><strong>{from}</strong> would like to see your screen.</p>
                    <p className={classes.caveat}>
                        If you accept, you choose what to share next. Everything on the
                        shared screen &mdash; including notifications and other
                        applications &mdash; becomes visible to them until you stop
                        sharing.
                    </p>
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={decline} variant="text" title="Reject screen sharing request">
                    Reject
                </Button>
                <Button onClick={accept} variant="contained" title="Accept screen sharing request">
                    Share screen
                </Button>
            </DialogActions>
        </Dialog>
    );
};


export default ScreenShareRequestModal;
