'use strict';

const React          = require('react');
const {useEffect, useRef}          = React;
const PropTypes      = require('prop-types');
const { makeStyles } = require('@material-ui/core/styles');
const { Fade, CircularProgress } = require('@material-ui/core');

const sylkrtc               = require('sylkrtc');

const { default: clsx }     = require('clsx');

const styleSheet = makeStyles((theme) => ({
    menuVideoContainer: {
        width: '240px',
        height: '132px',
        position: 'relative'
    },
    scaleFit: {
        transform: 'scale(-1, 1) !important',
        width: '100%',
        height: '100%',
        objectFit: 'cover'
    },
    videoOverlay: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: 'rgba(50,50,50,.6)',
        zIndex: 1
    },
    videoLabel: {
        width: '220px',
        fontSize: 14,
        zIndex: 2,
        position: 'absolute',
        color: '#fff',
        textAlign: 'center',
        padding: '8px',
        textOverflow: 'ellipsis'
    },
    pending: {
        alignItems: 'center',
        display: 'flex',
        height: '100%',
        justifyContent: 'center',
        position: 'absolute',
        width: '100%',
        zIndex: 2
    },
    failedText: {
        fontSize: 14
    },
    selectedBorder: {
        border: '3px solid #4cae4c'
    }
}));

const VideoMenuItem = (props) => {
    const classes = styleSheet();
    const video = useRef();

    useEffect(() => {
        if (props.stream !== 'failed') {
            sylkrtc.utils.attachMediaStream(props.stream, video.current, {muted: true, disableContextMenu: true, mirror: true});
        }
    }, [props.stream])

    const failed = () => {
        return props.stream && props.stream === 'failed'
    }

    return (
        <div className={clsx(classes.menuVideoContainer, {[`${classes.selectedBorder}`]: props.selected})}>
        { failed() &&
            <div className={clsx(classes.pending, classes.failedText)}>Camera unavailable</div>
        }
        { props.stream && !failed() &&
            <div className={classes.videoLabel}>{props.label}</div>
        }
        { props.stream ? (
            <React.Fragment>
                <div className={classes.videoOverlay}></div>
                <video className={classes.scaleFit} ref={video} autoPlay muted/>
            </React.Fragment>
        ) : (
            <div className={classes.pending}>
                <Fade
                    in={!props.stream}
                    style={{
                        transitionDelay: '100ms',
                        color: '#666'
                    }}
                    unmountOnExit
                >
                    <CircularProgress />
                </Fade>
            </div>
        )}
        </div>
    );
}

VideoMenuItem.propTypes = {
    stream: PropTypes.any,
    selected: PropTypes.bool,
    label: PropTypes.string
};


module.exports = VideoMenuItem;
