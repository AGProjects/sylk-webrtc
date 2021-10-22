'use strict';

const React         = require('react');
const PropTypes     = require('prop-types');
const { default: clsx } = require('clsx');
const { Grid }      = require('@material-ui/core');
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
            targetUri: this.props.missedTargetUri,
            showConferenceModal: false,
            sticky: false,
            height: utils.getWindowHeight() - 50
        };
        this.stickyTopRef = React.createRef();

        // ES6 classes no longer autobind
        this.handleTargetChange = this.handleTargetChange.bind(this);
        this.handleTargetSelect = this.handleTargetSelect.bind(this);
        this.handleAudioCall = this.handleAudioCall.bind(this);
        this.handleVideoCall = this.handleVideoCall.bind(this);
        this.handleChat = this.handleChat.bind(this);
        this.showConferenceModal = this.showConferenceModal.bind(this);
        this.handleConferenceCall = this.handleConferenceCall.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.conference = '';
    }

    componentDidMount() {
        this.observer = new IntersectionObserver(([e]) => {
            this.setState({sticky: e.intersectionRatio < 1});
            }, {threshold: [1]});
        this.observer.observe(this.stickyTopRef.current);
        window.addEventListener('resize', this.handleResize);
    }

    componentWillUnmount() {
        this.observer.unobserve(this.stickyTopRef.current);
        window.removeEventListener('resize', this.handleResize);
    }

    getTargetUri() {
        const defaultDomain = this.props.account.id.substring(this.props.account.id.indexOf('@') + 1);
        return utils.normalizeUri(this.state.targetUri, defaultDomain);
    }

    handleTargetChange(value) {
        if (value.startsWith(config.publicUrl)) {
            const url = new URL(value);
            if (url.pathname.startsWith('/conference')) {
                this.conference = url.pathname.split('/').pop();
                this.setState({showConferenceModal: true});
            } else if (url.pathname.startsWith('/call')) {
                value = url.pathname.split('/').pop();
            }
        }
        this.setState({targetUri: value});
    }

    handleTargetSelect() {
        if (this.props.noConnection) {
            return;
        }
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

    handleChat(uri) {
        this.props.startChat(uri);
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

    handleConferenceCall(targetUri, extraOptions) {
        this.setState({showConferenceModal: false});
        this.conference = '';
        if (targetUri) {
            this.props.startConference(targetUri, extraOptions);
        }
    }

    handleResize() {
        this.setState({height: utils.getWindowHeight() - 50});
    }

    render() {
        const classes = clsx({
            'btn'           : true,
            'btn-round-big' : true,
            'btn-success'   : this.state.targetUri.length !== 0,
            'btn-default'   : this.state.targetUri.length === 0
        });

        const stickyClasses = clsx({
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
                    <div className="inner cover scroll" style={{height: this.state.height}}>
                        <div className={stickyClasses} ref={this.stickyTopRef}>
                            <div className="form-dial">
                                <p className="lead">Enter the address you wish to call</p>
                                <URIInput
                                    defaultValue={this.state.targetUri}
                                    data={history}
                                    onChange={this.handleTargetChange}
                                    onSelect={this.handleTargetSelect}
                                    autoFocus={ !/Mobi|Android/i.test(navigator.userAgent) || true}
                                    placeholder="Eg. alice@sip2sip.info or 3333"
                                />
                                <div className="form-group">
                                    <button aria-label="Start an audio call" title="Audio call" type="button" className={classes} disabled={this.state.targetUri.length === 0 || this.props.noConnection} onClick={this.handleAudioCall}><i className="fa fa-phone"></i></button>
                                    <button aria-label="Start a video call" title="Video call" type="button" className={classes} disabled={this.state.targetUri.length === 0 || this.props.noConnection} onClick={this.handleVideoCall}><i className="fa fa-video-camera"></i></button>
                                    <button aria-label="Join a video conference" title="Join video conference" type="button" className="btn btn-primary btn-round-big" disabled={this.props.noConnection} onClick={this.showConferenceModal}><i className="fa fa-users"></i></button>
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
                                                    startChat      = {this.handleChat}
                                                    noConnection   = {this.props.noConnection}
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
                    handleConferenceCall={this.handleConferenceCall}
                    conference={this.conference}
                />
            </div>
        );
    }
}

ReadyBox.propTypes = {
    account         : PropTypes.object.isRequired,
    startCall       : PropTypes.func.isRequired,
    startConference : PropTypes.func.isRequired,
    startChat       : PropTypes.func.isRequired,
    missedTargetUri : PropTypes.string,
    history         : PropTypes.array,
    serverHistory   : PropTypes.array,
    noConnection    : PropTypes.bool
};


module.exports = ReadyBox;
