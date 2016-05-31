'use strict';

const React                     = require('react');
const ReactCSSTransitionGroup   = require('react-addons-css-transition-group');
const rtcninja                  = require('sylkrtc').rtcninja;
const classNames                = require('classnames');
const debug                     = require('debug');

const AudioCallBox = require('./AudioCallBox');

const DEBUG = debug('blinkrtc:LocalMedia');


class LocalMedia extends React.Component {
    constructor(props) {
        super(props);
        if (this.props.localMedia.getVideoTracks().length === 0) {
            DEBUG('Sending audio only');
            this.state = {audioOnly: true};
        } else {
            this.state = {audioOnly: false};
        }
        // ES6 classes no longer autobind
        this.hangupCall = this.hangupCall.bind(this);
    }

    componentDidMount() {
        if (!this.state.audioOnly) {
            this.refs.localVideo.addEventListener('loadeddata', this.showLocalVideoElement);
            this.refs.localVideo.oncontextmenu = function(e) {
                // disable right click for video elements
                e.preventDefault();
            };
            rtcninja.attachMediaStream(this.refs.localVideo, this.props.localMedia);
        }
    }

    componentWillUnmount() {
        if (!this.state.audioOnly) {
            this.refs.localVideo.removeEventListener('loadeddata', this.showLocalVideoElement);
        }
    }

    hangupCall(event) {
        event.preventDefault();
        this.props.call.terminate();
    }

    render() {
        const localVideoClasses = classNames({
            'large'    : true,
            'animated' : true,
            'fadeIn'   : true,
            'mirror'   : true
        });

        let localVideo;
        if (!this.state.audioOnly) {
            localVideo  = <video className={localVideoClasses} id="localVideo" ref="localVideo" autoPlay muted/>;
        }

        let remoteIdentity = '';
        if (this.props.call !== null) {
            remoteIdentity = this.props.call.remoteIdentity.toString();
        }

        let videoHeader;

        let buttonBarClasses = classNames({
            'video-started' : !this.state.audioOnly
        });

        let videoHeaderTextClasses = classNames({
            'lead'      : true,
            'text-info' : true
        });

        if (!this.state.audioOnly) {
            videoHeader = (
                <div key="header" className="video-header">
                    <p className={videoHeaderTextClasses}><strong>Call with</strong> {remoteIdentity}</p>
                </div>
            );
        }

        let hangupButton = <button key="hangupButton" type="button" className="btn btn-round-big btn-danger" onClick={this.hangupCall}> <i className="fa fa-phone rotate-135"></i> </button>;

        return (
            <div className="video-container" ref="videoContainer">
                <ReactCSSTransitionGroup transitionName="videoheader" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
                    {videoHeader}
                </ReactCSSTransitionGroup>
                {localVideo}
                {this.state.audioOnly && (
                    <AudioCallBox remoteIdentity={remoteIdentity} boxBsClass="info"/>
                )}
                <div className={buttonBarClasses}>
                    {hangupButton}
                </div>
            </div>
        );
    }
}

LocalMedia.propTypes = {
    call: React.PropTypes.object,
    localMedia: React.PropTypes.object
};


module.exports = LocalMedia;
