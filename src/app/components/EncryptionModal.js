
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
    },
    number: {
        fontSize: 32,
        textAlign: 'center',
        display: 'block',
        letterSpacing: 12,
        padding: 8
    }
});

const password = Math.random().toString().substr(2, 6);

function getContent(step = 0) {
    if (step === 1) {
        return (<React.Fragment>
            To replicate messages on multiple devices you need the same private key on all of them.<br/> <br/>
            Press <strong>Export</strong> and enter this code when prompted on your other device:<br/>
        </React.Fragment>);
    }
    return (<React.Fragment>
        To decrypt messages, you need a private key from another device. On another device go to  menu option 'Export private key'. <br /><br/>
        If you chose to generate a new key, previous messages cannot be read on newer devices.
        <br />
        Messaging can't be enabled unless you do either of these steps.<br /><br/>
        <span className="text-warning"><strong>Would you like to use <strong>this</strong> private key across all other devices?</strong></span>
    </React.Fragment>);
}

        // On the other devices, you'll need to enter the password that will be provided here upon export.< br/>
const EncryptionModal = (props) => {
    const classes = styleSheet();
    const [step, setStep] = React.useState(0);

    return (
        <Dialog
            open={props.show}
            onClose={props.close}
            maxWidth="sm"
            fullWidth={true}
            aria-labelledby="dialog-titile"
            aria-describedby="dialog-description"
        >
        <DialogTitle id="dialog-title" className={classes.bigger}>Export private key</DialogTitle>
            <DialogContent dividers>
                <DialogContentText id="dialog-description" className={classes.fixFont}>
                    {getContent(props.export ? 1 : step)}
                    {props.export && <span className={classes.number}>{password}</span>}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
            {props.export === false && (<React.Fragment>
                <Button
                    variant="contained"
                    onClick={() => {
                        setStep(1);
                        props.useExistingKey(password)
                    }}
                    title="yes"
                >
                    Yes
                </Button>
                <Button onClick={props.close} variant="text" title="cancel">No</Button>
            </React.Fragment>)}
            {props.export === true && (
                <Button
                    variant="contained"
                    onClick={() => {
                        props.exportKey(password);
                    }}
                    title="export"
                >
                    Export
                </Button>
            )}
            {(step === 1 || props.export === true) && (
                <Button onClick={props.close} variant="text" title="close">Close</Button>
            )}
            </DialogActions>
        </Dialog>
    );
}

EncryptionModal.propTypes = {
    show: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired,
    exportKey: PropTypes.func.isRequired,
    useExistingKey: PropTypes.func.isRequired,
    export: PropTypes.bool
};


module.exports = EncryptionModal;
