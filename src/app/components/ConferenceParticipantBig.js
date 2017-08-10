'use strict';

const React             = require('react');
const PropTypes         = require('prop-types');
const ReactBootstrap    = require('react-bootstrap');
const Tooltip           = ReactBootstrap.Tooltip;
const OverlayTrigger    = ReactBootstrap.OverlayTrigger;
const sylkrtc           = require('sylkrtc');
const hark              = require('hark');
const classNames        = require('classnames');


class ConferenceParticipantBig extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            active: false,
            hasVideo: false,
            audioMuted: false
        }
        this.speechEvents = null;
        this.speechActivityTimer = null;

        // ES6 classes no longer autobind
        [
            'onParticipantStateChanged'
        ].forEach((name) => {
            this[name] = this[name].bind(this);
        });

    }

    componentDidMount() {
        this.maybeAttachStream();
        this.refs.videoElement.oncontextmenu = (e) => {
            // disable right click for video elements
            e.preventDefault();
        };
    }

    componentWillUnmount() {
        if (this.speechEvents !== null) {
            this.speechEvents.stop();
            this.speechEvents = null;
        }
        clearInterval(this.speechActivityTimer);
    }

    onParticipantStateChanged(oldState, newState) {
        if (newState === 'established') {
            this.maybeAttachStream();
        }
    }

    maybeAttachStream() {
        const streams = this.props.participant.streams;
        if (streams.length > 0) {
            sylkrtc.utils.attachMediaStream(streams[0], this.refs.videoElement);
            this.setState({hasVideo: streams[0].getVideoTracks().length > 0});
            const options = {
                interval: 150,
                play: false
            };
            this.speechEvents = hark(streams[0], options);
            this.speechEvents.on('speaking', () => {
                this.speechActivityTimer = setInterval(() => {
                    const item = {
                        stream: streams[0],
                        identity: this.props.participant.identity
                    };
                }, 500);
                this.setState({active: true});
            });
            this.speechEvents.on('stopped_speaking', () => {
                clearInterval(this.speechActivityTimer);
                this.setState({active: false});
            });
        }
    }

    render() {
        const classes = classNames({
            'poster' : !this.state.hasVideo
        });

        let participantInfo;

        const remoteVideoClasses = classNames({
            'remote-video'      : true,
            'large'             : this.props.large,
            'conference-active' : this.state.active
        });

        participantInfo = (<div className="controls"><p className="lead">{this.props.participant.identity.displayName || this.props.participant.identity.uri}</p></div>);

        return (
            <div className={remoteVideoClasses}>
                {participantInfo}
                <div className="video">
                    <video poster="assets/images/transparent-1px.png" className={classes} ref="videoElement" autoPlay />
                </div>
            </div>
        );
    }
}

ConferenceParticipantBig.propTypes = {
    participant: PropTypes.object.isRequired,
    large: PropTypes.bool
};


module.exports = ConferenceParticipantBig;
