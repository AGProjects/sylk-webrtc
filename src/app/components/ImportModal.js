
'use strict';

const React          = require('react');
const PropTypes      = require('prop-types');
const { makeStyles } = require('@material-ui/core/styles');
const {
    Dialog,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton }     = require('@material-ui/core');
const { Close: CloseIcon  } = require('@material-ui/icons');
const { default: AuthCode } = require('react-auth-code-input');


const styleSheet = makeStyles((theme) => ({
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
        fontSize: '14px'
    },
    container: {
        padding: 16
    },
    input: {
        width: '2ch',
        padding: 8,
        borderRadius: 8,
        fontSize: 32,
        textAlign: 'center',
        marginRight: 12,
        border: '1px solid #ddd',
        background: 'none',
        textTransform: 'uppercase',
        boxSizing: 'content-box',
        lineHeight: 'normal',
        [theme.breakpoints.down('sm')]: {
            fontSize: 20,
            marginRight: 6,
            border: 'none',
            padding: 5,
            borderRadius: 0,
            borderBottom: '2px solid black',

            '&:focus': {
                outline: 'none'
            }
        }
    },
    closeButton: {
        position: 'absolute',
        right: theme.spacing(1),
        top: theme.spacing(1),
        color: theme.palette.grey[500],
        '&> span > svg': {
            fontSize: 24
        }
    }
}));


const ImportModal = (props) => {
    const classes = styleSheet();
    const [reset, setReset] = React.useState(0);

    const verifyPass = (value) =>{
        if (value.length === 6) {
            props.account.decryptKeyImport(props.message, value, (result) => {
                if (result.didDecrypt === true) {
                    props.importKey(result);
                } else {
                    setReset(1);
                    setImmediate(() => {
                        setReset(0)
                    });
                }
            });
        }
    };

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
            <DialogTitle id="dialog-title" className={classes.bigger}>
                Import private key
                <IconButton aria-label="close" className={classes.closeButton} onClick={props.close}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
                <DialogContent dividers>
                    <DialogContentText id="dialog-description" className={classes.fixFont}>
                        Sylk uses end-to-end encryption for messaging for which it needs a private key.
                    </DialogContentText>
                    { reset === 0 &&
                        <AuthCode
                            allowedCharacters = "^[0-9]"
                            characters = {6}
                            containerClassName = {classes.container}
                            inputClassName = {classes.input}
                            maxlength = "6"
                            onChange = {verifyPass}
                        />
                    }
                    <DialogContentText id="dialog-explain" className={classes.fixFont}>
                        A private key has been sent from one of your other devices.
                        Enter the code shown on the sending device to import it.
                    </DialogContentText>
            </DialogContent>
        </Dialog>
    );
}

ImportModal.propTypes = {
    show: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired,
    importKey: PropTypes.func.isRequired,
    account: PropTypes.object,
    message: PropTypes.object
};


module.exports = ImportModal;
