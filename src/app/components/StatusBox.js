'use strict';

const React      = require('react');
const classNames = require('classnames');


let StatusBox = React.createClass({
        render: function() {
            let classes = classNames({
                'alert' : true,
                'alert-warning' : this.props.level === 'warning',
                'alert-danger'  : this.props.level === 'danger'
            });
            return (
                <div className="form-signin">
                <div className={classes} role="alert">
                    <strong>{this.props.message}</strong>
                </div></div>
            );
        }
});

module.exports = StatusBox;
