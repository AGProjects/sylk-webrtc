'use strict';

const React      = require('react');
const PropTypes  = require('prop-types');
const sylkrtc    = require('sylkrtc');
const classNames = require('classnames');

const CallOverlay      = require('./CallOverlay');


class LocalMedia extends React.Component {
    constructor(props) {
        super(props);

        // ES6 classes no longer autobind
        this.hangupCall = this.hangupCall.bind(this);
        this.localVideoElementPlaying = this.localVideoElementPlaying.bind(this);
    }

    componentDidMount() {
        this.refs.localVideo.addEventListener('playing', this.localVideoElementPlaying);
        sylkrtc.utils.attachMediaStream(this.props.localMedia, this.refs.localVideo, {disableContextMenu: true});
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

        return (
            <div className="video-container" ref="videoContainer">
                <CallOverlay
                    show = {true}
                    remoteIdentity = {this.props.remoteIdentity}
                    call = {null}
                />
                <video className={localVideoClasses} id="localVideo" ref="localVideo" autoPlay muted />
                <div className="call-buttons">
                    <button key="hangupButton" type="button" className="btn btn-round-big btn-danger" onClick={this.hangupCall}> <i className="fa fa-phone rotate-135"></i> </button>
                </div>
            </div>
        );
    }
}

LocalMedia.propTypes = {
    hangupCall: PropTypes.func,
    localMedia: PropTypes.object.isRequired,
    mediaPlaying: PropTypes.func.isRequired,
    remoteIdentity: PropTypes.string
};


module.exports = LocalMedia;
