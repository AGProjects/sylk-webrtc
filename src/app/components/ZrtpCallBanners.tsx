import React, { useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions } from '@material-ui/core';
import { Button } from '../MaterialUIAsBootstrap';


interface Props {
    call: any;
    notificationCenter: () => {
        postEncryptionStatus: (title: string, message: string, level?: string | null) => any;
    };
}

const styleSheet = makeStyles({
    bigger: {
        '&> h2': {
            fontSize: '20px',
            color: '#d9534f'
        },
        '&> div > p': {
            fontSize: '14px'
        }
    },
    fixFont: {
        fontFamily: 'inherit',
        fontSize: '14px',
        textAlign: 'left'
    }
});
const ZrtpCallBanners = ({ call, notificationCenter }: Props) => {
    const classes = styleSheet();
    const [mandatoryFail, setMandatoryFail] = React.useState<{ detail: string } | null>(null);

    useEffect(() => {
        if (!call) return;
        const onDowngrade = () => {
            notificationCenter().postEncryptionStatus(
                'End-to-end encryption not active',
                'End-to-end encryption was attempted but did not activate for this call.',
                'info'
            );
        };

        const onH264Drop = () => {
            notificationCenter().postEncryptionStatus(
                'Video encryption unavailable',
                "Video disabled — H264 isn't compatible with strict end-to-end encryption. Audio remains end-to-end encrypted.",
                'info'
            );
        };

        const onMandatory = (data: any) => setMandatoryFail(data);

        call.on('zrtpDowngradeWarning',    onDowngrade);
        call.on('zrtpStrictH264VideoDrop', onH264Drop);
        call.on('zrtpMandatoryFailed',     onMandatory);

        return () => {
            call.off('zrtpDowngradeWarning',    onDowngrade);
            call.off('zrtpStrictH264VideoDrop', onH264Drop);
            call.off('zrtpMandatoryFailed',     onMandatory);
        };
    }, [call, notificationCenter]);

    if (!mandatoryFail) return null;

    return (
        <Dialog open onClose={() => {}} disableBackdropClick disableEscapeKeyDown maxWidth="sm" fullWidth>
            <DialogTitle className={classes.bigger}>End-to-end encryption required</DialogTitle>
            <DialogContent dividers>
                <DialogContentText className={classes.fixFont}>
                    This call could not be end-to-end encrypted, and your settings require it.
                    {' '}{mandatoryFail.detail}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={() => call.terminate()} variant="contained">End call</Button>
                <Button onClick={() => setMandatoryFail(null)} variant="text">Continue anyway</Button>
            </DialogActions>
        </Dialog>
    );
};

export default ZrtpCallBanners;
