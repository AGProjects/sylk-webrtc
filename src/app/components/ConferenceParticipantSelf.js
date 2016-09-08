'use strict';

const React           = require('react');
const ReactBootstrap  = require('react-bootstrap');
const Tooltip         = ReactBootstrap.Tooltip;
const OverlayTrigger  = ReactBootstrap.OverlayTrigger;
const rtcninja        = require('sylkrtc').rtcninja;


class ConferenceParticipantSelf extends React.Component {
    constructor(props) {
        super(props);

        // ES6 classes no longer autobind
        this.onVideoClicked = this.onVideoClicked.bind(this);
    }

    componentDidMount() {
        rtcninja.attachMediaStream(this.refs.videoElement, this.props.stream);
        this.refs.videoElement.oncontextmenu = (e) => {
            // disable right click for video elements
            e.preventDefault();
        };
    }

    onVideoClicked() {
        const item = {
            stream: this.props.stream,
            identity: this.props.identity
        };
        this.props.selected(item);
    }

    render() {
        const tooltip = (
            <Tooltip id="t-myself">{this.props.identity.displayName || this.props.identity.uri}</Tooltip>
        );

        return (
            <OverlayTrigger placement="top" overlay={tooltip}>
                <video ref="videoElement" onClick={this.onVideoClicked} className="mirror" autoPlay muted />
            </OverlayTrigger>
        );
    }
}

ConferenceParticipantSelf.propTypes = {
    stream: React.PropTypes.object.isRequired,
    identity: React.PropTypes.object.isRequired,
    selected: React.PropTypes.func.isRequired
};


module.exports = ConferenceParticipantSelf;
