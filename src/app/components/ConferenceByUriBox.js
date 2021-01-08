'use strict';

const React      = require('react');
const PropTypes  = require('prop-types');
const  { default: clsx } = require('clsx');

const ReactBootstrap = require('react-bootstrap');
const Popover        = ReactBootstrap.Popover;
const OverlayTrigger = ReactBootstrap.OverlayTrigger;
const { withStyles }    = require('@material-ui/core/styles');
const { Switch, FormGroup, FormControl, FormControlLabel, Typography } = require('@material-ui/core');
const { ButtonGroup } = require('@material-ui/core');
const { Popper, ClickAwayListener, Paper, Grow } = require('@material-ui/core');
const { MenuItem, MenuList, ListItemIcon } = require('@material-ui/core');

const { Button } = require('../MaterialUIAsBootstrap');
const Conference = require('./Conference');
const FooterBox  = require('./FooterBox');
const Logo       = require('./Logo');
const PreMedia   = require('./PreMedia');

const sylkrtc               = require('sylkrtc');


const styles = {
    label: {
        fontFamily: 'inherit',
        justifyContent: 'space-between',
        width: '100%',
        marginLeft: 0
    },
    labelText: {
        fontFamily: 'inherit',
        fontSize: '14px'
    },
    group: {
        fontFamily: 'inherit',
        width: '100%'
    },
    buttonCaret: {
        padding: '10px 12px',
        width: 'auto',
        marginLeft: '-1px'
    },
    menuItem: {
        display: 'inherit',
        fontSize: '16px'
    }
};

const GreenSwitch = withStyles({
    switchBase: {
        '&$checked': {
            color: '#5cb85c'
        },
        '&$checked + $track': {
            backgroundColor: '#5cb85c'
        }
    },
    checked: {},
    track: {
        backgroundColor: '#aaa'
    }
})(Switch);

class ConferenceByUriBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            displayName: '',
            lowBandwidth: props.lowBandwidth || false,
            preferredMedia: {
                audio: true,
                video: true
            },
            open: false
        };

        this._notificationCenter = null;

        // ES6 classes no longer autobind
        this.handleDisplayNameChange = this.handleDisplayNameChange.bind(this);
        this.handleAudio = this.handleAudio.bind(this);
        this.handleToggle = this.handleToggle.bind(this);
        this.handleClose = this.handleClose.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);

        this.callStateChanged = this.callStateChanged.bind(this);

        this.anchorRef = React.createRef();
    }

    componentDidMount() {
        if (!this.props.localMedia) {
            this.props.getLocalMedia();
        }
        this._notificationCenter = this.props.notificationCenter();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.lowBandwidth !== this.state.lowBandwidth) {
            let preferredMedia = Object.assign({}, this.state.preferredMedia);
            if (this.state.lowBandwidth) {
                preferredMedia.video = false;
                setTimeout(() => {
                    sylkrtc.utils.closeMediaStream(this.props.localMedia);
                    this.props.getLocalMedia(preferredMedia);
                }, 200);
            } else {
                sylkrtc.utils.closeMediaStream(this.props.localMedia);
                this.props.getLocalMedia(preferredMedia);
            }
        }

        if (prevState.preferredMedia.video !== this.state.preferredMedia.video) {
            if (!this.state.preferredMedia.video) {
                // Stop and remove the track if you want to join audio only.
                // If you closeStreams and getLocalMedia and this takes time, joining
                // will be not working.
                const track = this.props.localMedia.getVideoTracks()[0];
                track.stop();
                this.props.localMedia.removeTrack(track);
            }
        }

        if (!prevProps.currentCall && this.props.currentCall) {
            this.props.currentCall.on('stateChanged', this.callStateChanged);
        }
    }

    callStateChanged(oldState, newState, data) {
        if (newState === 'terminated') {
            this._notificationCenter.postSystemNotification('Thanks for calling with Sylk!', {timeout: 10});
        }
    }

    handleDisplayNameChange(event) {
        this.setState({displayName: event.target.value});
    }

    handleAudio(event) {
        let preferredMedia = Object.assign({}, this.state.preferredMedia);
        preferredMedia.video = false;
        this.setState({preferredMedia, open: false});
        event.persist();
        setImmediate(() => {this.handleSubmit(event)});
    }

    handleToggle(event) {
        event.currentTarget.blur();
        this.setState({open: !this.state.open});
    }

    handleClose(event) {
        if (this.anchorRef.current && this.anchorRef.current.contains(event.target)) {
            return;
        }
        this.setState({open: false});
    }

    handleSubmit(event) {
        event.preventDefault();
        let displayName;
        if (this.state.displayName === '') {
            this.setState({displayName: 'Guest'});
            displayName = 'Guest';
        } else {
            displayName = this.state.displayName;
            // Bug in SIPSIMPLE, display name can't end with \ else we don't join chat
            if (displayName.endsWith('\\')) {
                displayName = displayName.slice(0, -1);
            }
        }
        let preferredMedia = Object.assign({}, this.state.preferredMedia);
        if (this.state.lowBandwidth) {
            preferredMedia.video = false;
        }
        this.props.handler(displayName, this.props.targetUri, {lowBandwidth: this.state.lowBandwidth, mediaConstraints: preferredMedia});
    }

    render() {
        let content;
        if (this.props.account !== null && this.props.localMedia) {
            content = (
                <Conference
                    notificationCenter = {this.props.notificationCenter}
                    localMedia = {this.props.localMedia}
                    account = {this.props.account}
                    currentCall = {this.props.currentCall}
                    targetUri = {this.props.targetUri}
                    hangupCall = {this.props.hangupCall}
                    shareScreen = {this.props.shareScreen}
                    generatedVideoTrack = {this.props.generatedVideoTrack}
                    participantIsGuest = {true}
                    propagateKeyPress = {this.props.propagateKeyPress}
                    toggleShortcuts = {this.props.toggleShortcuts}
                    lowBandwidth = {this.state.lowBandwidth}
                />
            );
        } else {
            const classes = clsx({
                'capitalize' : true,
                'btn'        : true,
                'btn-lg'     : true,
                'btn-block'  : true,
                'btn-primary': true
            });
            const caretClasses = clsx({
                'fa'           : true,
                'fa-caret-down': !this.state.open,
                'fa-caret-up'  : this.state.open
            });

            const friendlyName = this.props.targetUri.split('@')[0];

            const popoverBottom = (
                <Popover id="popover-positioned-bottom" title="Low Bandwidth mode">
                        <Typography align="left">In low bandwidth mode you will participate with audio and chat. Video and screen-sharing are not available.</Typography>
                </Popover>
            );

            content = (
                <div>
                    <PreMedia
                        localMedia={this.props.generatedVideoTrack ? null : this.props.localMedia }
                        hide={this.state.lowBandwidth}
                    />
                    <Logo />
                    <h2>Join conference room:<br/><strong>{friendlyName}</strong></h2>
                    <form className="form-guest" onSubmit={this.handleSubmit}>
                        <label className="sr-only">Name</label>
                        <div className="input-group">
                            <span className="input-group-addon"><i className="fa fa-globe fa-fw"></i></span>
                            <input id="inputName"
                                className="form-control"
                                placeholder="Enter your name (optional)"
                                value={this.state.displayName}
                                onChange={this.handleDisplayNameChange}
                            />
                        </div>
                        <br />
                        <OverlayTrigger trigger={['hover', 'focus']} placement="top" overlay={popoverBottom}>
                            <FormControl className={this.props.classes.group} component="fieldset">
                                <FormGroup row>
                                    <FormControlLabel
                                        control={
                                            <GreenSwitch
                                                checked={this.state.lowBandwidth}
                                                onChange={(event) => this.setState({lowBandwidth: event.target.checked})}
                                                color="primary"
                                                name="low-bandwith"
                                                inputProps={{'aria-label': 'enable low bandwidth mode'}}
                                            />
                                        }
                                        className={this.props.classes.label}
                                        label={<Typography className={this.props.classes.labelText}>Low-bandwidth mode</Typography>}
                                        labelPlacement="start"
                                    />
                                </FormGroup>
                            </FormControl>
                        </OverlayTrigger>
                        <ButtonGroup variant="contained" fullWidth disableElevation ref={this.anchorRef} aria-label="split button">
                            <Button
                                size="large"
                                type="submit"
                            >
                                <i className="fa fa-sign-in"></i> Join
                            </Button>
                            <Button
                                className={this.props.classes.buttonCaret}
                                aria-controls={open ? 'split-button-menu' : undefined}
                                aria-expanded={open ? 'true' : undefined}
                                aria-label="select join without video"
                                aria-haspopup="menu"
                                onClick={this.handleToggle}
                                size="large"
                            >
                                <i className={caretClasses}></i>
                            </Button>
                        </ButtonGroup>
                        <Popper
                            open={this.state.open}
                            anchorEl={this.anchorRef.current}
                            role={undefined}
                            placement="bottom-start"
                            transition
                            disablePortal
                            style={{marginTop: '8px', width: '300px'}}
                        >
                            {({ TransitionProps, placement }) => (
                                <Grow
                                    {...TransitionProps}
                                    style={{
                                        transformOrigin: placement === 'bottom-start' ? 'right top' : 'left bottom'
                                    }}
                                >
                                    <Paper style={{width: '100%'}}>
                                        <ClickAwayListener onClickAway={this.handleClose}>
                                            <MenuList id="split-button-menu">
                                                <MenuItem
                                                    key="join-without-video"
                                                    onClick={this.handleAudio}
                                                    className={this.props.classes.menuItem}
                                                >
                                                    <ListItemIcon>
                                                        <i className="fa fa-video-camera-slash"></i>
                                                    </ListItemIcon>
                                                    Join without video
                                                </MenuItem>
                                            </MenuList>
                                        </ClickAwayListener>
                                    </Paper>
                                </Grow>
                            )}
                        </Popper>
                    </form>
                </div>
            );
        }

        return (
            <div className="cover-container">
                {!this.props.account && this.props.localMedia && <FooterBox />}
                <div className="inner cover" >
                    {content}
                </div>
                {!this.props.account && this.props.localMedia && <FooterBox />}
            </div>
        );
    }
}

ConferenceByUriBox.propTypes = {
    classes             : PropTypes.object.isRequired,
    notificationCenter  : PropTypes.func.isRequired,
    handler             : PropTypes.func.isRequired,
    hangupCall          : PropTypes.func.isRequired,
    shareScreen         : PropTypes.func.isRequired,
    propagateKeyPress   : PropTypes.func.isRequired,
    toggleShortcuts     : PropTypes.func.isRequired,
    getLocalMedia       : PropTypes.func.isRequired,
    targetUri           : PropTypes.string,
    localMedia          : PropTypes.object,
    account             : PropTypes.object,
    currentCall         : PropTypes.object,
    generatedVideoTrack : PropTypes.bool,
    lowBandwidth        : PropTypes.bool
};


module.exports = withStyles(styles)(ConferenceByUriBox);
