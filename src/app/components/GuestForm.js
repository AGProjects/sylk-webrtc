'use strict';

const React      = require('react');
const classNames = require('classnames');

const config     = require('../config');


class GuestForm extends React.Component {
    constructor(props) {
        super(props);
        this.state = {accountId: ''};
        // ES6 classes no longer autobind
        this.handleAccountIdChange = this.handleAccountIdChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleAccountIdChange(event) {
        this.setState({accountId: event.target.value});
    }

    handleSubmit(event) {
        event.preventDefault();
        let accountId = this.state.accountId.replace(/ /g,'_');
        accountId = accountId + '@' + config.defaultGuestDomain;
        this.props.handleRegistration(accountId,'',true);
    }

    render() {
        const validInput = this.state.accountId !== '';
        const classes = classNames({
            'capitalize' : true,
            'btn'        : true,
            'btn-lg'     : true,
            'btn-block'  : true,
            'btn-default': !validInput,
            'btn-primary': validInput
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
                    <button type="submit" className={classes} disabled={!validInput}>Sign In</button>
                </form>
            </div>
        );
    }
}

GuestForm.propTypes = {
    handleRegistration: React.PropTypes.func.isRequired
};


module.exports = GuestForm;
