'use strict';

const React          = require('react');
const PropTypes      = require('prop-types');
const { makeStyles } = require('@material-ui/core/styles');
const { Menu, MenuItem, ListItemIcon }   = require('@material-ui/core');


const styleSheet = makeStyles({
    item: {
        fontSize: '14px',
        color: '#333',
        minHeight: 0,
        lineHeight: '20px'
    },
    icon: {
        minWidth: '20px'
     }
});

const ConferenceMenu = (props) => {
    const classes = styleSheet();

    const handleShortcut = (event) => {
        props.toggleShortcuts();
        props.close(event);
    };

    const handleDevices = (event) => {
        props.toggleDevices();
        props.close(event);
    };
    return (
        <div>
            <Menu
                id="conference-menu"
                anchorEl={props.anchor}
                open={props.show}
                onClose={props.close}
                elevation={0}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right'
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right'
                }}
                getContentAnchorEl={null}
            >
                <MenuItem onClick={handleShortcut} className={classes.item}>
                    <ListItemIcon className={classes.icon}><i className="fa fa-keyboard-o fa-fw" /></ListItemIcon> View shortcuts
                </MenuItem>
                <MenuItem onClick={handleDevices} className={classes.item}>
                    <ListItemIcon className={classes.icon}><i className="fa fa-random fa-fw" /></ListItemIcon> Switch Devices
                </MenuItem>
            </Menu>
        </div>
    );
}

ConferenceMenu.propTypes = {
    show: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired,
    anchor: PropTypes.object,
    toggleShortcuts: PropTypes.func,
    toggleDevices: PropTypes.func
};


module.exports = ConferenceMenu;
