'use strict';

const React      = require('react');
const classNames = require('classnames');

const Conference = require('./Conference');


class ConferenceByUriBox extends React.Component {
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

    handleSubmit(event) {
        event.preventDefault();
        if (this.state.displayName === '') {
            this.setState({displayName: 'Guest'});
        }
        this.props.handler(this.state.displayName, this.props.targetUri);
    }

    render() {
        const validInput = this.state.displayName !== '';
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
                />
            );
        } else {
            const classes = classNames({
                'capitalize' : true,
                'btn'        : true,
                'btn-lg'     : true,
                'btn-block'  : true,
                'btn-primary': true
            });

            const friendlyName = this.props.targetUri.split('@')[0];

            content = (
                <div>
                    <h2>You're about to join a video conference!<br/><strong>{friendlyName}</strong></h2>
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
    notificationCenter : React.PropTypes.func.isRequired,
    handler            : React.PropTypes.func.isRequired,
    hangupCall         : React.PropTypes.func.isRequired,
    targetUri          : React.PropTypes.string,
    localMedia         : React.PropTypes.object,
    account            : React.PropTypes.object,
    currentCall        : React.PropTypes.object
};


module.exports = ConferenceByUriBox;
