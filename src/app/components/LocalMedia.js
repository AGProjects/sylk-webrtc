'use strict';

const React      = require('react');
const PropTypes  = require('prop-types');
const sylkrtc    = require('sylkrtc');
const { default: clsx } = require('clsx');

const CallOverlay      = require('./CallOverlay');


class LocalMedia extends React.Component {
    constructor(props) {
        super(props);

        this.localVideo = React.createRef();

        // ES6 classes no longer autobind
        this.hangupCall = this.hangupCall.bind(this);
        this.localVideoElementPlaying = this.localVideoElementPlaying.bind(this);
    }

    componentDidMount() {
        this.localVideo.current.addEventListener('playing', this.localVideoElementPlaying);
        sylkrtc.utils.attachMediaStream(this.props.localMedia, this.localVideo.current, {disableContextMenu: true, muted: true});
    }

    componentWillUnmount() {
        this.localVideo.current.removeEventListener('playing', this.localVideoElementPlaying);
    }

    localVideoElementPlaying() {
        this.localVideo.current.removeEventListener('playing', this.localVideoElementPlaying);
        this.props.mediaPlaying();
    }

    hangupCall(event) {
        event.preventDefault();
        this.props.hangupCall();
    }

    render() {
        const localVideoClasses = clsx({
            'large'    : true,
            'animated' : true,
            'fadeIn'   : true,
            'mirror'   : !this.props.generatedVideoTrack
        });

        return (
            <div className="video-container">
                <CallOverlay
                    show = {true}
                    remoteIdentity = {this.props.remoteIdentity}
                    call = {null}
                />
                <video className={localVideoClasses} id="localVideo" ref={this.localVideo} autoPlay muted />
                <div className="call-buttons">
                    <button key="hangupButton" type="button" className="btn btn-round-big btn-danger" onClick={this.hangupCall}> <i className="fa fa-phone rotate-135"></i> </button>
                </div>
            </div>
        );
    }
}

LocalMedia.propTypes = {
    hangupCall          : PropTypes.func,
    localMedia          : PropTypes.object.isRequired,
    mediaPlaying        : PropTypes.func.isRequired,
    remoteIdentity      : PropTypes.string,
    generatedVideoTrack : PropTypes.bool
};


module.exports = LocalMedia;
