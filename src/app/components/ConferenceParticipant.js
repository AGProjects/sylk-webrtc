'use strict';

const React           = require('react');
const ReactBootstrap  = require('react-bootstrap');
const Tooltip         = ReactBootstrap.Tooltip;
const OverlayTrigger  = ReactBootstrap.OverlayTrigger;
const rtcninja        = require('rtcninja');
const hark            = require('hark');
const classNames      = require('classnames');


class ConferenceParticipant extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            active: false
        }
        this.speechEvents = null;

        // ES6 classes no longer autobind
        this.onParticipantStateChanged = this.onParticipantStateChanged.bind(this);
        this.onVideoClicked = this.onVideoClicked.bind(this);

        props.participant.on('stateChanged', this.onParticipantStateChanged);
    }

    componentDidMount() {
        this.maybeAttachStream();
        this.refs.videoElement.oncontextmenu = (e) => {
            // disable right click for video elements
            e.preventDefault();
        };
    }

    componentWillUnmount() {
        this.refs.videoElement.src = '';
        this.props.participant.removeListener('stateChanged', this.onParticipantStateChanged);
        if (this.speechEvents !== null) {
            this.speechEvents.stop();
            this.speechEvents = null;
        }
    }

    onParticipantStateChanged(oldState, newState) {
        if (newState === 'established') {
            this.maybeAttachStream();
        }
    }

    onVideoClicked() {
        const streams = this.props.participant.streams;
        const item = {
            stream: streams.length > 0 ? streams[0] : null,
            identity: this.props.participant.identity
        };
        this.props.selected(item);
    }

    maybeAttachStream() {
        const streams = this.props.participant.streams;
        if (streams.length > 0) {
            rtcninja.attachMediaStream(this.refs.videoElement, streams[0]);
            const options = {
                interval: 150,
                play: false
            };
            this.speechEvents = hark(streams[0], options);
            this.speechEvents.on('speaking', () => {
                this.setState({active: true});
            });
            this.speechEvents.on('stopped_speaking', () => {
                this.setState({active: false});
            });
        }
    }

    render() {
        const tooltip = (
            <Tooltip id={this.props.participant.id}>{this.props.participant.identity.displayName || this.props.participant.identity.uri}</Tooltip>
        );

        const streams = this.props.participant.streams;
        const hasVideo = streams.length > 0 ? streams[0].getVideoTracks().length > 0 : false;

        const classes = classNames({
            'poster' : !hasVideo,
            'conference-active' : this.state.active
        });

        return (
            <OverlayTrigger placement="top" overlay={tooltip}>
                <video ref="videoElement" onClick={this.onVideoClicked} className={classes} poster="/assets/images/transparent-1px.png" autoPlay />
            </OverlayTrigger>
        );
    }
}

ConferenceParticipant.propTypes = {
    participant: React.PropTypes.object.isRequired,
    selected: React.PropTypes.func.isRequired
};


module.exports = ConferenceParticipant;
