
'use strict';

const React          = require('react');
const PropTypes      = require('prop-types');
const { makeStyles } = require('@material-ui/core/styles');
const { 
    Dialog, 
    DialogTitle, 
    DialogContent, 
    DialogContentText, 
    DialogActions }  = require('@material-ui/core');
const { Button }     = require('../MaterialUIAsBootstrap');


const styleSheet = makeStyles({
    bigger: {
        '&> h2': {
            fontSize: '20px'
        },
        '&> div > p ': {
            fontSize: '14px'
        },
        '&> li.MuiListSubheader-root': {
            fontSize: '14px',
            textAlign: 'left'
        }
    },
    fixFont: {
        fontFamily: 'inherit',
        fontSize: '14px',
        textAlign: 'left'
    }
});

function getContent() {
    return (<React.Fragment>
        To decrypt your messages, your private key is required.<br/><br/>
        Please choose <strong><em>'Export private key'</em></strong> on a device/browser where you signed in before.<br /><br />
        If you <strong>lost access</strong> to this device/browser, please continue with 'Generate a new private key',
        or 'Cancel' and messaging will be <strong>disabled</strong>.
        If you choose to generate a new key, your previous messages cannot be read on newer devices.
    </React.Fragment>);
}

const NewDeviceModal = (props) => {
    const classes = styleSheet();

    return (
        <Dialog
            open={props.show}
            onClose={(event, reason) => {
                if (reason !== 'backdropClick') {
                    props.close();
                }
            }}
            maxWidth="sm"
            fullWidth={true}
            aria-labelledby="dialog-titile"
            aria-describedby="dialog-description"
            disableEscapeKeyDown
        >
        <DialogTitle id="dialog-title" className={classes.bigger}>New device/browser?</DialogTitle>
                <DialogContent dividers>
                    <DialogContentText id="dialog-description" className={classes.fixFont}>
                        {getContent()}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button onClick={props.close} variant="text" title="Cancel">Cancel</Button>
                <Button
                    variant="contained"
                    onClick={props.generatePGPKeys}
                    title="Generate keys"
                    disabled={props.private}
                >
                    Generate Private Key
                </Button>
            </DialogActions>
        </Dialog>
    );
}

NewDeviceModal.propTypes = {
    show: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired,
    generatePGPKeys: PropTypes.func.isRequired,
    private: PropTypes.bool.isRequired
};


module.exports = NewDeviceModal;
