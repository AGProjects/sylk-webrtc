'use strict';

const React          = require('react');
const ReactBootstrap = require('react-bootstrap');
const Dropdown       = ReactBootstrap.Dropdown;
const MenuItem       = ReactBootstrap.MenuItem;
const classNames     = require('classnames');


let CallBox = React.createClass({
    getInitialState: function() {
        return {targetUri: '',
                callState: null
        };
    },

    getTargetUri: function() {
        let targetUri = this.state.targetUri;
        if (targetUri.indexOf('@') === -1) {
            // take the domain part from the account
            const domain = this.props.account.id.substring(this.props.account.id.indexOf('@') + 1);
            targetUri += '@' + domain;
        }
        return targetUri;
    },

    handleTargetChange: function(event) {
        this.setState({targetUri: event.target.value});
    },

    handleAudioCall: function(event) {
        event.preventDefault();
        this.props.startAudioCall(this.getTargetUri());
    },

    handleVideoCall: function(event) {
        event.preventDefault();
        this.props.startVideoCall(this.getTargetUri());
    },

    handleMenu: function(event, data) {
        if (data === 'logOut') {
            this.props.signOut();
        }
    },

    render: function() {
        let classes = classNames({
            'btn'         : true,
            'btn-lg'      : true,
            'btn-success' : this.state.targetUri.length !== 0,
            'btn-warning' : this.state.targetUri.length === 0,
        });
        let registrationClasses = classNames({
            'success' : this.props.account.registrationState === 'registered',
            'danger'  : this.props.account.registrationState !== 'registered',
        });
        return (
            <div>
                <div className="cover-container">
                    <div className="inner cover">
                        <div className='blink_logo'></div><br/>
                        <form className="form-dial" name='DialForm'>
                            <p className='lead'>Enter the address you wish to call</p>
                            <div className="input-group input-group-lg">
                                <input type='text' id="inputDestination" className="form-control"
                                    onChange={this.handleTargetChange}
                                    value={this.state.targetUri}
                                    required autofocus />
                                <span className="input-group-btn">
                                    <button type="button" className={classes} disabled={this.state.targetUri.length === 0} onClick={this.handleAudioCall}><i className='fa fa-phone'></i></button>
                                    <button type="submit" className={classes} disabled={this.state.targetUri.length === 0} onClick={this.handleVideoCall}><i className='fa fa-video-camera'></i></button>
                                </span>
                            </div>
                            <br/>
                            <p>You can receive calls at {this.props.account.id}</p>
                        </form>
                    </div>
                </div>
                <div className='settings'>
                    <span className={registrationClasses}></span>
                    <Dropdown pullRight onSelect={this.handleMenu} id='dropdown-custom-1'>
                        <Dropdown.Toggle noCaret bsStyle={registrationClasses}>
                            <i className='fa fa-cogs'></i>
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <MenuItem header><strong><i className='fa fa-user'></i> {this.props.account.id}</strong></MenuItem>
                            <MenuItem divider />
                            <MenuItem eventKey='settings' target="_blank" href='https://mdns.sipthor.net/sip_settings.phtml'><i className="fa fa-wrench"></i> Settings</MenuItem>
                            <MenuItem eventKey='logOut'><i className="fa fa-sign-out"></i> Sign Out</MenuItem>
                        </Dropdown.Menu>
                    </Dropdown>
                </div>
            </div>
        );
    }
});

module.exports = CallBox;
