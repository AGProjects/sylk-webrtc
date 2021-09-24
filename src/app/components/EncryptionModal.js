
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
            Your secret PGP key is being exported.<br/>
            Enter this code when promted on your other device<br/>
        </React.Fragment>);
    }
    return (<React.Fragment>
        Sylk uses end-to-end encryption for messaging to contacts that support this.<br /><br/>
        You have used Sylk on a different device/browser and you have a different PGP key on this device/browser.<br/><br />
        The PGP key from <strong>this device/brower</strong> can be used for <strong>all</strong> other devices/browsers. This will export the key to your other devices/browsers.<br /><br/>
        If you <strong>don't</strong> want to use this key, you need to <strong>export</strong> the key from the other device/browser.<br />
        Messaging can't be enabled unless you do either of these steps.<br /><br/>
        <span className="text-warning"><strong>Would you like to use <strong>this</strong> PGP key across all other devices?</strong></span>
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
        <DialogTitle id="dialog-title" className={classes.bigger}>Secure messaging</DialogTitle>
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
