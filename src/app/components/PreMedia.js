'use strict';

const React = require('react');
const useRef = React.useRef;
const useEffect = React.useEffect;
const useState = React.useState;
const useCallback = React.useCallback;

const debug       = require('debug');
const PropTypes  = require('prop-types');
const { default: clsx } = require('clsx');

const { default: CSSTransition } = require('react-transition-group/CSSTransition');

const { makeStyles }    = require('@material-ui/core/styles');

const sylkrtc               = require('sylkrtc');

const DEBUG = debug('blinkrtc:Storage');


const styleSheet = makeStyles({
    premediaOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(transparent, rgba(0,0,0,.9))'
    },
    hide: {
        opacity: 0,
        visibility: 'hidden'
    },
    background: {
        zIndex: -1
    }
});

const PreMedia = (props) => {
    const classes = styleSheet(props);
    const [show, setShow] = useState(false);
    const [init, setInit] = useState(false);
    const localVideo = useRef(null);

    const localVideoElementPlaying = useCallback(() => {
        localVideo.current.removeEventListener('canplay', localVideoElementPlaying);
        localVideo.current.removeEventListener('playing', localVideoElementPlaying);
        setShow(true);
    }, []);

    useEffect(() => {
        const videoEl = localVideo.current;
        if (videoEl !== null && props.localMedia) {
            if (props.localMedia.getVideoTracks().length !== 0) {
                videoEl.addEventListener('canplay', localVideoElementPlaying);
                videoEl.addEventListener('playing', localVideoElementPlaying);

                sylkrtc.utils.attachMediaStream(props.localMedia, videoEl, {disableContextMenu: false, muted: true});

                const playOnGesture = () => {
                    videoEl.play().catch(e => DEBUG('play failed:', e));
                };

                videoEl.play().catch(() => {
                    DEBUG('autoplay blocked, waiting for gesture');
                    document.addEventListener('click', playOnGesture, { once: true });
                    document.addEventListener('touchend', playOnGesture, { once: true });
                });
            }
        }
        return () => {
            if (videoEl !== null) {
                videoEl.removeEventListener('canplay', localVideoElementPlaying);
                videoEl.removeEventListener('playing', localVideoElementPlaying);
            }
        };
    }, [props.localMedia, localVideoElementPlaying]);

    useEffect(() => {
        if (localVideo.current !== null && props.hide) {
                localVideo.current.removeEventListener('playing', localVideoElementPlaying);
                setShow(false);
        }
    }, [props.hide, localVideoElementPlaying]);

    const enter = () => {
        if (!init) {
            setInit(true);
        }
    };

    const videoClasses = clsx({
        'video-container'   : true
    },
        !init && classes.hide,
        classes.background
    );

    return (
        <div>
            {props.localMedia &&
                <CSSTransition
                    in={show}
                    timeout={{ enter: 300, exit: 300}}
                    classNames="premedia-display"
                    onEnter = {enter}
                >
                    <div className={videoClasses}>
                <video className="large mirror" id="localVideo" ref={localVideo} autoPlay muted />
                        <div className={classes.premediaOverlay}></div>
                    </div>
                </CSSTransition>
            }
        </div>
    );
}

PreMedia.propTypes = {
    localMedia: PropTypes.object,
    hide: PropTypes.bool
};


module.exports = PreMedia;
