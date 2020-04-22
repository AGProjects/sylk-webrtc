'use strict';

const React      = require('react');
const PropTypes  = require('prop-types');
const { default: clsx } = require('clsx');


const StatusBox = (props) => {
    const classes = clsx({
        'alert' : true,
        'alert-warning' : props.level === 'warning',
        'alert-danger'  : props.level === 'danger',
        'alert-info'    : props.level === 'info'
    });

    const widthClasses = clsx({
        'form-signin' : props.width === 'small' || !props.width,
        'form-dial'   : props.width === 'medium',
        'half-width'   : props.width === 'large'
    });

    let message;
    if (props.title) {
        message = (<div><strong>{props.title}</strong><br/>{props.message}</div>);
    } else {
        message = (<div><strong>{props.message}</strong></div>);
    }

    return (
        <div className={widthClasses}>
            <div className={classes} role="alert">
                {message}
            </div>
        </div>
    );
};

StatusBox.propTypes = {
    level: PropTypes.string,
    message: PropTypes.string.isRequired,
    title: PropTypes.string,
    width: PropTypes.oneOf(['small', 'medium','large'])
};


module.exports = StatusBox;
