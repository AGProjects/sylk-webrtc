'use strict';

const React         = require('react');
const PropTypes     = require('prop-types');
const classNames    = require('classnames');
const Mui           = require('material-ui');
const Grid          = Mui.Grid;
const VizSensor     = require('react-visibility-sensor').default;

const ConferenceModal = require('./ConferenceModal');
const HistoryCard     = require('./HistoryCard');
const HistoryTileBox  = require('./HistoryTileBox');
const FooterBox       = require('./FooterBox');
const URIInput        = require('./URIInput');
const config          = require('../config');
const utils           = require('../utils');


class ReadyBox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            targetUri: this.props.targetUri,
            showConferenceModal: false,
            sticky: false
        };
        this.stickyTopRef = React.createRef();

        // ES6 classes no longer autobind
        this.handleTargetChange = this.handleTargetChange.bind(this);
        this.handleTargetSelect = this.handleTargetSelect.bind(this);
        this.handleAudioCall = this.handleAudioCall.bind(this);
        this.handleVideoCall = this.handleVideoCall.bind(this);
        this.showConferenceModal = this.showConferenceModal.bind(this);
        this.handleConferenceCall = this.handleConferenceCall.bind(this);
    }

    componentDidMount() {
        this.observer = new IntersectionObserver(([e]) => {
            this.setState({sticky: e.intersectionRatio < 1});
            }, {threshold: [1]});
        this.observer.observe(this.stickyTopRef.current);
    }

    componentWillUnmount() {
        this.observer.unobserve(this.stickyTopRef.current);
    }

    getTargetUri() {
        const defaultDomain = this.props.account.id.substring(this.props.account.id.indexOf('@') + 1);
        return utils.normalizeUri(this.state.targetUri, defaultDomain);
    }

    handleTargetChange(value) {
        this.setState({targetUri: value});
    }

    handleTargetSelect() {
        // the user pressed enter, start a video call by default
        if (this.state.targetUri.endsWith(`@${config.defaultConferenceDomain}`)) {
            this.props.startConference(this.state.targetUri);
        } else {
            this.props.startCall(this.getTargetUri(), {audio: true, video: true});
        }
    }

    handleAudioCall(event) {
        event.preventDefault();
        if (this.state.targetUri.endsWith(`@${config.defaultConferenceDomain}`)) {
            this.props.startConference(this.state.targetUri);
        } else {
            this.props.startCall(this.getTargetUri(), {audio: true, video: false});
        }
    }

    handleVideoCall(event) {
        event.preventDefault();
        if (this.state.targetUri.endsWith(`@${config.defaultConferenceDomain}`)) {
            this.props.startConference(this.state.targetUri);
        } else {
            this.props.startCall(this.getTargetUri(), {audio: true, video: true});
        }
    }

    showConferenceModal(event) {
        event.preventDefault();
        if (this.state.targetUri.length !== 0) {
            const uri = `${this.state.targetUri.split('@')[0].replace(/[\s()-]/g, '')}@${config.defaultConferenceDomain}`;
            this.handleConferenceCall(uri.toLowerCase());
        } else {
            this.setState({showConferenceModal: true});
        }
    }

    handleConferenceCall(targetUri) {
        this.setState({showConferenceModal: false});
        if (targetUri) {
            this.props.startConference(targetUri);
        }
    }

    render() {
        const classes = classNames({
            'btn'           : true,
            'btn-round-big' : true,
            'btn-success'   : this.state.targetUri.length !== 0,
            'btn-default'   : this.state.targetUri.length === 0
        });

        const stickyClasses = classNames({
            'sticky-wrapper'    : true,
            'sticky'            : this.state.sticky
        });

        // Join URIs from local and server history for input
        let history = this.props.history.concat(
            this.props.serverHistory.map(e => e.remoteParty)
        );
        history = [...new Set(history)];

        return (
            <div>
                <div className="cover-container">
                    <div className="inner cover scroll">
                        <div className={stickyClasses} ref={this.stickyTopRef}>
                            <div className="form-dial">
                                <p className="lead">Enter the address you wish to call</p>
                                <URIInput
                                    defaultValue={this.state.targetUri}
                                    data={history}
                                    onChange={this.handleTargetChange}
                                    onSelect={this.handleTargetSelect}
                                    autoFocus={true}
                                    placeholder="Eg. alice@sip2sip.info or 3333"
                                />
                                <div className="form-group">
                                    <button type="button" className={classes} disabled={this.state.targetUri.length === 0} onClick={this.handleAudioCall}><i className="fa fa-phone"></i></button>
                                    <button type="button" className={classes} disabled={this.state.targetUri.length === 0} onClick={this.handleVideoCall}><i className="fa fa-video-camera"></i></button>
                                    <button type="button" className="btn btn-primary btn-round-big" onClick={this.showConferenceModal}><i className="fa fa-users"></i></button>
                                </div>
                            </div>
                        </div>
                        <div className="extra-shadow"></div>
                        <HistoryTileBox>
                            {this.props.serverHistory.filter(historyItem => historyItem.remoteParty.startsWith(this.state.targetUri)).map((historyItem, idx) =>
                                (
                                    <Grid item md={4} sm={6} xs={12} key={idx}>
                                        <VizSensor partialVisibility>
                                            {({isVisible}) => (
                                                <div
                                                    className={isVisible ? 'card-visible animated bounceIn' : 'card-hidden'}
                                                >
                                                <HistoryCard
                                                    historyItem    = {historyItem}
                                                    setTargetUri   = {this.handleTargetChange}
                                                    startVideoCall = {this.handleVideoCall}
                                                    startAudioCall = {this.handleAudioCall}
                                                />
                                                </div>
                                            )}
                                        </VizSensor>
                                    </Grid>
                                )
                            )}
                        </HistoryTileBox>
                        <FooterBox />
                    </div>
                </div>
                <ConferenceModal
                    show={this.state.showConferenceModal}
                    targetUri={this.state.targetUri}
                    handleConferenceCall={this.handleConferenceCall}
                />
            </div>
        );
    }
}

ReadyBox.propTypes = {
    account         : PropTypes.object.isRequired,
    startCall       : PropTypes.func.isRequired,
    startConference : PropTypes.func.isRequired,
    targetUri       : PropTypes.string,
    history         : PropTypes.array,
    serverHistory   : PropTypes.array
};


module.exports = ReadyBox;
