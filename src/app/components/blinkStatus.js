'use strict';

import React from 'react';
import classNames from 'classnames';

const Status = React.createClass({

        render() {
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
