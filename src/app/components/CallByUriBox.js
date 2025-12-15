'use strict';

const React      = require('react');
const PropTypes  = require('prop-types');
const { default: clsx } = require('clsx');

const Call       = require('./Call');
const FooterBox  = require('./FooterBox');
const PreMedia   = require('./PreMedia');

class CallByUriBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            displayName: ''
        };

        this._notificationCenter = null;

        // ES6 classes no longer autobind
        this.handleDisplayNameChange = this.handleDisplayNameChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
        this.callStateChanged = this.callStateChanged.bind(this);
    }

    componentDidMount() {
        if (!this.props.localMedia) {
            this.props.getLocalMedia();
        }
        this._notificationCenter = this.props.notificationCenter();
    }

    componentDidUpdate(prevProps, prevState) {
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

    handleSubmit(event) {
        event.preventDefault();
        this.props.handleCallByUri(this.state.displayName, this.props.targetUri);
    }

    render() {
        const validInput = this.state.displayName !== '';
        let content;

        if (this.props.account !== null && this.props.localMedia) {
            content = (
                <Call
                    localMedia = {this.props.localMedia}
                    account = {this.props.account}
                    currentCall = {this.props.currentCall}
                    targetUri = {this.props.targetUri}
                    hangupCall = {this.props.hangupCall}
                    shareScreen = {this.props.shareScreen}
                    generatedVideoTrack = {this.props.generatedVideoTrack}
                    setDevice = {this.props.setDevice}
                    remoteAudio = {this.props.remoteAudio}
                />
            );
        } else {
            const classes = clsx({
                'capitalize' : true,
                'btn'        : true,
                'btn-lg'     : true,
                'btn-block'  : true,
                'btn-default': !validInput,
                'btn-primary': validInput
            });

            content = (
                <div>
                    <PreMedia
                        localMedia={this.props.generatedVideoTrack ? null : this.props.localMedia }
                    />
                    <h2>You&#39;ve been invited to call<br/><strong>{this.props.targetUri}</strong></h2>
                    <form className="form-guest" onSubmit={this.handleSubmit}>
                        <label className="sr-only">Name</label>
                        <div className="input-group">
                            <span className="input-group-addon"><i className="fa fa-globe fa-fw"></i></span>
                            <input id="inputName"
                                className="form-control"
                                placeholder="Enter your name"
                                value={this.state.displayName}
                                onChange={this.handleDisplayNameChange}
                                required
                                autoFocus
                            />
                        </div>
                        <br />
                        <button type="submit" className={classes} disabled={!validInput}><i className="fa fa-video-camera"></i> Call</button>
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
            </div>
        );
    }
}

CallByUriBox.propTypes = {
    handleCallByUri     : PropTypes.func.isRequired,
    notificationCenter  : PropTypes.func.isRequired,
    hangupCall          : PropTypes.func.isRequired,
    setDevice           : PropTypes.func.isRequired,
    shareScreen         : PropTypes.func.isRequired,
    getLocalMedia       : PropTypes.func.isRequired,
    targetUri           : PropTypes.string,
    localMedia          : PropTypes.object,
    account             : PropTypes.object,
    currentCall         : PropTypes.object,
    generatedVideoTrack : PropTypes.bool,
    remoteAudio         : PropTypes.object,
};


module.exports = CallByUriBox;
