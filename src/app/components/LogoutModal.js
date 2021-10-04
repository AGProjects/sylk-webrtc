
'use strict';

const React          = require('react');
const PropTypes      = require('prop-types');
const { makeStyles } = require('@material-ui/core/styles');
const {
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    FormGroup, 
    FormControlLabel } = require('@material-ui/core');
const {
    Close: CloseIcon } = require('@material-ui/icons');
const { Button }       = require('../MaterialUIAsBootstrap');


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
    root: {
        marginTop: -5,
        '&$checked': {
        },
        '& .MuiSvgIcon-root': {
            fontSize: 24
        }
    },
    checked: {},
    center: {
        flexGrow: 1,
        paddingLeft: 12,
        color: 'rgba(0, 0, 0, 0.54)',
        marginBottom: 0
    },
    fixFont: {
        fontFamily: 'inherit',
        fontSize: '14px',
        textAlign: 'left'
    },
    fixFontCheck: {
        marginBottom: 0
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


const LogoutModal = (props) => {
    const classes = styleSheet();
    const [removeData, _setRemoveData] = React.useState(false);

    const setRemoveData = (event) => {
        _setRemoveData(event.target.checked);
    }

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
                Sign out of Sylk
                <IconButton aria-label="close" className={classes.closeButton} onClick={props.close}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <DialogContentText id="dialog-description" className={classes.fixFont}>
                    You will be no longer reachable for calls and messages on this device/browser.
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <FormGroup
                    row
                    classes={{
                        root: classes.center
                    }}
                >
                    <FormControlLabel
                        classes={{
                            root: classes.fixFontCheck,
                            label: classes.fixFont
                        }}
                        control={
                            <Checkbox
                                checked={removeData}
                                onChange={setRemoveData}
                                classes={{
                                    root: classes.root,
                                    checked: classes.checked
                                }}
                            />
                        }
                        label="Also remove your existing data"
                    />
                </FormGroup>
                <Button onClick={props.close} variant="text" title="Cancel">Cancel</Button>
                <Button onClick={() => {props.logout(removeData); _setRemoveData(false)}} variant="contained" title="Sign Out">Sign Out</Button>
                </DialogActions>
        </Dialog>
    );
}

LogoutModal.propTypes = {
    show: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired,
    logout: PropTypes.func.isRequired
};


module.exports = LogoutModal;
