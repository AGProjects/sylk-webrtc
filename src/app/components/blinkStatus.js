'use strict';

import React from 'react';

const Status = React.createClass({

        render() {
            var classNames = require('classnames');
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

module.exports = Status;
