'use strict';
 
const React = require('react');
const PropTypes = require('prop-types');
const { makeStyles } = require('@material-ui/core/styles');
const { Menu, MenuItem, ListSubheader, ListItemIcon, Fade, CircularProgress } = require('@material-ui/core');
 
// Same visual language as SwitchDevicesMenu (paper width, item/subheader/
// selected styling, anchor + direction positioning) so this reads as the
// same control everywhere it appears in the app.
const styleSheet = makeStyles((theme) => ({
    paper: {
        marginLeft: props => props.direction === 'right' ? '5px' : '',
        marginTop: props => props.direction !== 'right' && props.direction !== 'up' ? '5px' : '',
        width: '272px'
    },
    item: {
        fontSize: '14px',
        fontFamily: 'inherit',
        color: '#333',
        minHeight: 0,
        lineHeight: '30px',
        margin: '4px 0'
    },
    label: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        paddingLeft: '20px',
        flex: 3
    },
    subheader: {
        textAlign: 'left',
        fontFamily: 'inherit',
        fontWeight: 700,
        fontSize: '14px'
    },
    icon: {
        minWidth: '20px'
    },
    selected: {
        color: '#fff',
        backgroundColor: '#337ab7 !important',
        '&:hover': {
            backgroundColor: 'rgba(0,0,0, .04) !important',
            color: '#000'
        }
    }
}));
 
// Lists available cameras (videoinput devices) in a Menu anchored to a
// trigger button/icon.
//
// Unlike SwitchDevicesMenu, this does NOT require an active `call` - it's
// used to pick a camera before any call/local video stream exists yet (the
// upgrade-to-video preview dialog), so the device list and current
// selection are passed in as props rather than derived from
// call.getLocalStreams(). If this ever needs to switch cameras *during* an
// established call, prefer SwitchDevicesMenu there instead, since it
// already handles replaceTrack against the live peer connection.
const CameraSelectMenu = (props) => {
    const classes = styleSheet(props);
 
    return (
        <Menu
            id="camera-select-menu"
            anchorEl={props.anchor}
            open={props.show}
            onClose={props.close}
            classes={{ paper: classes.paper }}
            anchorOrigin={{
                vertical: props.direction && (props.direction === 'right' || props.direction === 'up') ? 'top' : 'bottom',
                horizontal: props.direction && props.direction === 'right' ? 'right' : 'center'
            }}
            transformOrigin={{
                vertical: props.direction && props.direction === 'up' ? 'bottom' : 'top',
                horizontal: props.direction && props.direction === 'right' ? 'left' : 'center'
            }}
            getContentAnchorEl={null}
        >
            {props.devices.length >= 1 ? (
                <div>
                    <ListSubheader key="camera-title" className={classes.subheader}>
                        <ListItemIcon className={classes.icon}>
                            <i className="fa fa-video-camera"></i>
                        </ListItemIcon>
                        Cameras
                    </ListSubheader>
                    {props.devices.map((device, index) => {
                        const id = device.deviceId;
                        return (
                            <MenuItem
                                key={id || index}
                                className={classes.item}
                                classes={{ selected: classes.selected }}
                                selected={id === props.selectedDeviceId}
                                title={device.label}
                                onClick={() => {
                                    props.onSelect(device);
                                    props.close();
                                }}
                            >
                                <div className={classes.label}>{device.label || `Camera ${index + 1}`}</div>
                            </MenuItem>
                        );
                    })}
                </div>
            ) : (
                <Fade
                    in={props.devices.length === 0}
                    style={{
                        transitionDelay: props.devices.length === 0 ? '100ms' : '0ms',
                        color: '#666'
                    }}
                    unmountOnExit
                >
                    <CircularProgress />
                </Fade>
            )}
        </Menu>
    );
};
 
CameraSelectMenu.propTypes = {
    show: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired,
    onSelect: PropTypes.func.isRequired,
    devices: PropTypes.array.isRequired,
    selectedDeviceId: PropTypes.string,
    anchor: PropTypes.object,
    direction: PropTypes.string
};
 
module.exports = CameraSelectMenu;
