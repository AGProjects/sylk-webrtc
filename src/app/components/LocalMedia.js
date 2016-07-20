'use strict';

const React                   = require('react');
const ReactCSSTransitionGroup = require('react-addons-css-transition-group');
const rtcninja                = require('sylkrtc').rtcninja;
const classNames              = require('classnames');


class LocalMedia extends React.Component {
    constructor(props) {
        super(props);

        // ES6 classes no longer autobind
        this.hangupCall = this.hangupCall.bind(this);
        this.localVideoElementPlaying = this.localVideoElementPlaying.bind(this);

    }

    componentDidMount() {
        this.refs.localVideo.addEventListener('playing', this.localVideoElementPlaying);
        this.refs.localVideo.oncontextmenu = function(e) {
            // disable right click for video elements
            e.preventDefault();
        };
        rtcninja.attachMediaStream(this.refs.localVideo, this.props.localMedia);

    }

    componentWillUnmount() {
        this.refs.localVideo.removeEventListener('playing', this.localVideoElementPlaying);
    }

    localVideoElementPlaying() {
        this.refs.localVideo.removeEventListener('playing', this.localVideoElementPlaying);
        this.props.mediaPlaying();
    }

    hangupCall(event) {
        event.preventDefault();
        this.props.hangupCall();
    }

    render() {
        const localVideoClasses = classNames({
            'large'    : true,
            'animated' : true,
            'fadeIn'   : true,
            'mirror'   : true
        });

        const headerTextClasses = classNames({
            'lead'          : true,
            'text-info'     : true
        });

        return (
            <div className="video-container" ref="videoContainer">
                <ReactCSSTransitionGroup transitionName="videoheader" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
                    <div key="header" className="call-header">
                        <p className={headerTextClasses}><strong>Call with</strong> {this.props.remoteIdentity}</p>
                        <p className={headerTextClasses}>Connecting...</p>
                    </div>
                </ReactCSSTransitionGroup>
                <video className={localVideoClasses} id="localVideo" ref="localVideo" autoPlay muted/>
                <div className="call-buttons">
                    <button key="hangupButton" type="button" className="btn btn-round-big btn-danger" onClick={this.hangupCall}> <i className="fa fa-phone rotate-135"></i> </button>
                </div>
            </div>
        );
    }
}

LocalMedia.propTypes = {
    hangupCall: React.PropTypes.func,
    localMedia: React.PropTypes.object.isRequired,
    mediaPlaying: React.PropTypes.func.isRequired,
    remoteIdentity: React.PropTypes.string
};


module.exports = LocalMedia;
