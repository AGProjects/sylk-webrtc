'use strict';

const React = require('react');
const useRef = React.useRef;
const useEffect = React.useEffect;
const useState = React.useState;
const PropTypes  = require('prop-types');
const { default: clsx } = require('clsx');

const CSSTransition             = require('react-transition-group/CSSTransition');

const { makeStyles }    = require('@material-ui/core/styles');

const sylkrtc               = require('sylkrtc');


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

    useEffect(() => {
        if (localVideo.current !== null && props.localMedia) {
            if (props.localMedia.getVideoTracks().length !== 0) {
                localVideo.current.addEventListener('playing', localVideoElementPlaying);
                sylkrtc.utils.attachMediaStream(props.localMedia, localVideo.current, {disableContextMenu: true, muted: true});
            }
        }
        return (() => {
            if (localVideo.current !== null) {
                localVideo.current.removeEventListener('playing', localVideoElementPlaying); //eslint-disable-line react-hooks/exhaustive-deps
            }
        })
    }, [props.localMedia]);

    useEffect(() => {
        if (localVideo.current !== null && props.hide) {
                localVideo.current.removeEventListener('playing', localVideoElementPlaying);
                setShow(false);
        }
    }, [props.hide]);

    const enter = () => {
        if (!init) {
            setInit(true);
        }
    };

    const localVideoElementPlaying = () => {
        setShow(true);
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
