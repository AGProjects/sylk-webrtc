'use strict';

const React             = require('react');
const attachMediaStream = require('attachmediastream');
const classNames        = require('classnames');

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
        attachMediaStream(this.props.localMedia, this.refs.localVideo, {disableContextMenu: true});
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
