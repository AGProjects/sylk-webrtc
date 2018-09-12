'use strict';

const React                 = require('react');
const PropTypes             = require('prop-types');
const classNames            = require('classnames');
const CSSTransitionGroup    = require('react-transition-group/CSSTransitionGroup');
const sylkrtc               = require('sylkrtc');
const hark                  = require('hark');

const Styles        = require('material-ui/styles');
const withStyles    = Styles.withStyles;
const Colors        = require('material-ui/colors');
const Green         = Colors.green;
const Mui           = require('material-ui');
const Progress      = Mui.LinearProgress;

const styleSheet = {
    accentColor: {
        backgroundColor: Green[100]
    },
    accentColorBar: {
        backgroundColor: Green[500]
    },
    root: {
        height: '10px',
        opacity: '0.7'
    },
    determinateBar1: {
        transition: 'transform 0.2s linear'
    }
};

class Preview extends React.Component {
    constructor(props) {
        super(props);
        this.speechEvents = null;
        this.camera = '';
        this.state = {
            volume: 0
        }

        // ES6 classes no longer autobind
        this.hangupCall = this.hangupCall.bind(this);
        this.localVideoElementPlaying = this.localVideoElementPlaying.bind(this);
    }

    componentDidMount() {
        this.refs.localVideo.addEventListener('playing', this.localVideoElementPlaying);
        sylkrtc.utils.attachMediaStream(this.props.localMedia, this.refs.localVideo, {disableContextMenu: true});
        if (this.props.localMedia.getVideoTracks().length === 0) {
            this.camera = 'No Camera';
        } else {
            this.camera = this.props.localMedia.getVideoTracks()[0].label;
        }
    }

    componentWillUnmount() {
        clearTimeout(this.delayTimer);
        this.refs.localVideo.removeEventListener('playing', this.localVideoElementPlaying);
        if (this.speechEvents !== null) {
            this.speechEvents.stop();
            this.speechEvents = null;
        }
    }

    localVideoElementPlaying() {
        this.refs.localVideo.removeEventListener('playing', this.localVideoElementPlaying);
        const options = {
            interval: 225,
            play: false
        };
        this.speechEvents = hark(this.props.localMedia, options);
        this.speechEvents.on('volume_change', (vol, threshold) => {
            this.setState({volume: 2 * (vol + 75)});
        });
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
        const textClasses = classNames({
            'lead'          : true
        });

        let color = 'primary';
        if (this.state.volume > 20) {
            color = 'accent';
        }

        let header = '';
        if (this.camera !== '') {
            header = (
                <div key="header-container">
                    <div key="header" className="call-header">
                        <p className={textClasses}><strong>Preview</strong></p>
                        <p className={textClasses}>{this.camera}</p>
                    </div>
                    <Progress classes={this.props.classes} mode="determinate" color={color} value={this.state.volume}></Progress>
                </div>
            );
        }

        let icon = '';
        if (this.camera === 'No Camera') {
            icon = (
                <div>
                    <p><i className="fa fa-video-camera-slash fa-5 fa-fw"></i></p>
                    <p className="lead">No camera detected</p>
                </div>
            );
        }

        return (
            <div>
            {icon}
            <div className="video-container" ref="videoContainer">
                <div className="top-overlay">
                    <CSSTransitionGroup transitionName="videoheader" transitionEnterTimeout={300} transitionLeaveTimeout={300}>
                        {header}
                    </CSSTransitionGroup>
                </div>
                <video className={localVideoClasses} id="localVideo" ref="localVideo" autoPlay muted />
                <div className="call-buttons">
                    <button key="hangupButton" type="button" className="btn btn-round-big btn-danger" onClick={this.hangupCall}> <i className="fa fa-power-off"></i> </button>
                </div>
            </div>
            </div>
        );
    }
}

Preview.propTypes = {
    hangupCall: PropTypes.func,
    localMedia: PropTypes.object.isRequired,
    classes     : PropTypes.object.isRequired
};


module.exports = withStyles(styleSheet)(Preview);
