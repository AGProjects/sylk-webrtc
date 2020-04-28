
'use strict';

const React          = require('react');
const PropTypes      = require('prop-types');
const { makeStyles } = require('@material-ui/core/styles');
const { Dialog, DialogTitle, DialogContent, DialogActions, Divider, Button }   = require('@material-ui/core');
const { List, ListSubheader, ListItem, ListItemText, ListItemSecondaryAction } = require('@material-ui/core');


const styleSheet = makeStyles({
    bigger: {
        '&> h2': {
            fontSize: '20px'
        },
        '&> li > div > div > span ': {
            fontSize: '14px'
        },
        '&> li.MuiListSubheader-root': {
            fontSize: '14px',
            textAlign: 'left'
        }
    },
    button: {
        boxShadow: 'none',
        textTransform: 'none',
        fontSize: 14,
        padding: '6px 12px',
        border: '1px solid',
        lineHeight: 1.5,
        backgroundColor: '#337ab7',
        borderColor: '#0063cc',
        color: '#fff',
        '&:hover': {
            backgroundColor: '#286090',
            borderColor: '#204d74',
            boxShadow: 'none'
        },
        '&:active': {
            boxShadow: 'none',
            backgroundColor: '#286090',
            borderColor: '#204d74'
        },
        '&:focus': {
            boxShadow: '0 0 0 0.2rem rgba(0,123,255,.5)'
        }
    }
});

const ShortcutsModal = (props) => {
    const classes = styleSheet();
    return (
        <Dialog
            open={props.show}
            onClose={props.close}
            maxWidth="sm"
            fullWidth={true}
            aria-labelledby="dialog-title"
        >
            <DialogTitle id="dialog-title" className={classes.bigger}>Keyboard Shortcuts</DialogTitle>
            <DialogContent dividers>
                <List className={classes.bigger} dense>
                    <ListItem>
                        <ListItemText>Mute or unmute your microphone</ListItemText>
                        <ListItemSecondaryAction><kbd>M</kbd></ListItemSecondaryAction>
                    </ListItem>
                    <ListItem>
                        <ListItemText>Mute or unmute your video</ListItemText>
                        <ListItemSecondaryAction><kbd>V</kbd></ListItemSecondaryAction>
                    </ListItem>
                    <ListItem>
                        <ListItemText>View or exit full screen</ListItemText>
                        <ListItemSecondaryAction><kbd>F</kbd></ListItemSecondaryAction>
                    </ListItem>
                    <ListItem>
                        <ListItemText>Switch between camera and screen sharing</ListItemText>
                        <ListItemSecondaryAction><kbd>S</kbd></ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                    <ListSubheader>
                       Conferences:
                    </ListSubheader>
                    <ListItem>
                        <ListItemText>Open or close the chat</ListItemText>
                        <ListItemSecondaryAction><kbd>C</kbd></ListItemSecondaryAction>
                    </ListItem>
                    <ListItem>
                        <ListItemText>Cycle through active speakers</ListItemText>
                        <ListItemSecondaryAction><kbd>space</kbd></ListItemSecondaryAction>
                    </ListItem>
                    <ListItem>
                        <ListItemText>Raise or lower your hand</ListItemText>
                        <ListItemSecondaryAction><kbd>H</kbd></ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                    <ListItem>
                        <ListItemText>Show help</ListItemText>
                        <ListItemSecondaryAction><kbd>?</kbd></ListItemSecondaryAction>
                    </ListItem>
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={props.close} className={classes.button} title="close">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
}

ShortcutsModal.propTypes = {
    show: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired
};


module.exports = ShortcutsModal;
