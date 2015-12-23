'use strict';

const React      = require('react');
const classNames = require('classnames');


let StatusBox = React.createClass({
    propTypes: {
        level: React.PropTypes.string,
        message: React.PropTypes.string.isRequired,
        title: React.PropTypes.string,
        width: React.PropTypes.oneOf(['small', 'medium','large'])
    },

    render: function() {
        let classes = classNames({
            'alert' : true,
            'alert-warning' : this.props.level === 'warning',
            'alert-danger'  : this.props.level === 'danger',
            'alert-info'    : this.props.level === 'info'
        });

        let widthClasses = classNames({
            'form-signin' : this.props.width === 'small' || !this.props.width,
            'form-dial'   : this.props.width === 'medium',
            'halfWidth'   : this.props.width === 'large'
        });

        let message;
        if (this.props.title) {
            message = (<div><strong>{this.props.title}</strong><br/>{this.props.message}</div>);
        } else {
            message = (<div><strong>{this.props.message}</strong></div>);
        }

        return (
            <div className={widthClasses}>
                <div className={classes} role="alert">
                    {message}
                </div>
            </div>
        );
    }
});

module.exports = StatusBox;
