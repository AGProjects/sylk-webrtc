'use strict';

const React      = require('react');
const PropTypes  = require('prop-types');
const  { default: clsx } = require('clsx');

const ReactBootstrap = require('react-bootstrap');
const Popover        = ReactBootstrap.Popover;
const OverlayTrigger = ReactBootstrap.OverlayTrigger;
const { withStyles }    = require('@material-ui/core/styles');
const { Switch, FormGroup, FormControl, FormControlLabel, Typography } = require('@material-ui/core');

const Conference = require('./Conference');


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
    track: {}
})(Switch);

class ConferenceByUriBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            displayName: '',
            lowBandwidth: false,
            preferredMedia: {
                audio: true,
                video: true
            }
        };

        this._notificationCenter = null;

        // ES6 classes no longer autobind
        this.handleDisplayNameChange = this.handleDisplayNameChange.bind(this);
        this.handleAudio = this.handleAudio.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.callStateChanged = this.callStateChanged.bind(this);
    }

    componentDidMount() {
        this._notificationCenter = this.props.notificationCenter();
    }

    componentWillReceiveProps(nextProps) {
        if (!this.props.currentCall && nextProps.currentCall) {
            nextProps.currentCall.on('stateChanged', this.callStateChanged);
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
        preferredMedia.video = !event.target.checked;
        this.setState({preferredMedia});
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

        if (this.props.localMedia !== null) {
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

            const friendlyName = this.props.targetUri.split('@')[0];

            const popoverBottom = (
                <Popover id="popover-positioned-bottom" title="Low Bandwith mode">
                        <Typography align="left">Low bandwidth mode means you will participate with audio and chat. Screensharing and video is not available.</Typography>
                </Popover>
            );

            content = (
                <div>
                    <h2>You&#39;re about to join a conference!<br/><strong>{friendlyName}</strong></h2>
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
                        <FormControl className={this.props.classes.group} component="fieldset">
                            <FormGroup row>
                                <FormControlLabel
                                    control={
                                        <GreenSwitch
                                            checked={!this.state.preferredMedia.video}
                                            onChange={this.handleAudio}
                                            color="primary"
                                            name="video-support"
                                            classes={{colorPrimary: this.props.classes.colorPrimary}}
                                            inputProps={{'aria-label': 'turn off my video'}}
                                        />
                                    }
                                    className={this.props.classes.label}
                                    label={<Typography className={this.props.classes.labelText}>Turn off my video</Typography>}
                                    labelPlacement="start"
                                />
                            </FormGroup>
                        </FormControl>
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
                                    label={<Typography className={this.props.classes.labelText}>Enable low-bandwidth mode</Typography>}
                                    labelPlacement="start"
                                />
                            </FormGroup>
                        </FormControl>
                            </OverlayTrigger>
                        <button type="submit" className={classes}><i className="fa fa-sign-in"></i> Join</button>
                    </form>
                </div>
            );
        }

        return (
            <div className="cover-container">
                <div className="inner cover" >
                    {content}
                </div>
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
    targetUri           : PropTypes.string,
    localMedia          : PropTypes.object,
    account             : PropTypes.object,
    currentCall         : PropTypes.object,
    generatedVideoTrack : PropTypes.bool
};


module.exports = withStyles(styles)(ConferenceByUriBox);
