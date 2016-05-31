'use strict';

const React                     = require('react');
const classNames                = require('classnames');
const debug                     = require('debug');

const DEBUG = debug('blinkrtc:AudioCallBox');


let AudioCallBox = React.createClass({
    propTypes: {
        callDuration: React.PropTypes.object,
        remoteIdentity: React.PropTypes.string,
        boxBsClass: React.PropTypes.string
    },

    render: function() {
        let audioCallDisplayClasses = classNames({
            'alert'         : true,
            'alert-success' : this.props.boxBsClass === 'success',
            'alert-info'    : this.props.boxBsClass === 'info'
        });
        return (
            <div>
                <span className="fa-stack fa-4">
                    <i className="fa fa-volume-off move-icon fa-stack-2x"></i>
                    <i className="move-icon2 fa fa-volume-up fa-stack-2x animate-sound1"></i>
                </span>
                <div className="cover-container">
                    <div className="inner cover halfWidth">
                        <div className={audioCallDisplayClasses} role="alert">
                            <div className="row">
                                <strong>Call with</strong> {this.props.remoteIdentity}
                                <br/>
                                {this.props.callDuration}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
});

module.exports = AudioCallBox;
