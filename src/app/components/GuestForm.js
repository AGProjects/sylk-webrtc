'use strict';

const React      = require('react');
const classNames = require('classnames');

const config     = require('../config');


let GuestForm = React.createClass({
    propTypes: {
        handleRegistration: React.PropTypes.func.isRequired
    },

    getInitialState: function() {
        return {
            accountId: ''
        };
    },

    handleAccountIdChange: function(event) {
        this.setState({accountId: event.target.value});
    },

    handleSubmit: function(event) {
        event.preventDefault();
        let accountId = this.state.accountId.replace(/ /g,'_');
        accountId = accountId + '@' + config.defaultGuestDomain;
        this.props.handleRegistration(accountId);
    },

    render: function() {
        let classes = classNames({
            'capitalize' : true,
            'btn'        : true,
            'btn-lg'     : true,
            'btn-block'  : true,
            'btn-default': this.state.accountId == '',
            'btn-primary': this.state.accountId !== ''
        });

        return (
            <div>
                <p className="lead">Sign in to continue</p>
                <p>In guest mode you can only call local users.</p>
                <form className="form-guest" onSubmit={this.handleSubmit}>
                    <label className="sr-only">Name</label>
                    <div className="input-group">
                        <span className="input-group-addon"><i className="fa fa-globe fa-fw"></i></span>
                        <input id="inputName" className="form-control" placeholder="Nickname" value={this.state.accountId} onChange={this.handleAccountIdChange} required autoFocus/>
                    </div>
                    <button type="submit" className={classes}>Sign In</button>
                </form>
            </div>
        );
    }
});

module.exports = GuestForm;
