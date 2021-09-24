
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
        Sylk uses end-to-end encryption for messaging to contacts that support this.<br/><br/>
        You signed in before with an other device/browser. Please choose <strong>'Export private key'</strong> on this device.<br /><br />
        If you lost access to this device/browser, please continue with 'Generate a new private key', or 'Cancel' and messaging will be <strong>disabled</strong>.
    </React.Fragment>);
}

const NewDeviceModal = (props) => {
    const classes = styleSheet();
    const [step, setStep] = React.useState(0);

    const input = React.useRef();

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
                <Button onClick={props.close} variant="text" title="ignore">Cancel</Button>
                <Button variant="contained" onClick={props.generatePGPKeys} title="import">Generate Private Key</Button>
            </DialogActions>
        </Dialog>
    );
}

NewDeviceModal.propTypes = {
    show: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired,
    generatePGPKeys: PropTypes.func.isRequired
};


module.exports = NewDeviceModal;
