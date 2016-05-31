'use strict';

const React  = require('react');
const classNames = require('classnames');

const Logo       = require('./Logo');
const config     = require('../config');


class CallByUriBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            accountId: ''
        };
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
        this.props.handleCallByUri(accountId, this.props.targetUri);
    }

    render() {
        let validInput = this.state.accountId !== '';
        let defaultContent;
        let thanksContent;

        let classes = classNames({
            'capitalize' : true,
            'btn'        : true,
            'btn-lg'     : true,
            'btn-block'  : true,
            'btn-default': this.state.accountId == '',
            'btn-primary': this.state.accountId !== ''
        });

        if (this.props.callByUri !== 'finished') {
            defaultContent = (
                <div>
                    <h2>You've been invited to call<br/><strong>{this.props.targetUri}</strong></h2>
                    <form className="form-guest" onSubmit={this.handleSubmit}>
                        <label className="sr-only">Name</label>
                        <div className="input-group">
                            <span className="input-group-addon"><i className="fa fa-globe fa-fw"></i></span>
                            <input id="inputName"
                                className="form-control"
                                placeholder="Name"
                                disabled={this.props.callState === 'init'}
                                value={this.state.accountId}
                                onChange={this.handleAccountIdChange}
                                required
                                autoFocus
                            />
                        </div>
                        <button type="submit" className={classes} disabled={this.props.callState === 'init' || !validInput}><i className="fa fa-video-camera"></i> Call</button>
                    </form>
                </div>
            );
        } else {
            thanksContent = (
                <div>
                    <Logo />
                    <h2>Thanks for calling!</h2>
                </div>
            );
        }

        return (
            <div className="cover-container">
                <div className="inner cover" >
                    {defaultContent}
                    {thanksContent}
                </div>
            </div>
        );
    }
}

CallByUriBox.propTypes = {
    handleCallByUri : React.PropTypes.func.isRequired,
    targetUri       : React.PropTypes.string,
    callState       : React.PropTypes.string,
    callByUri       : React.PropTypes.string
};


module.exports = CallByUriBox;
