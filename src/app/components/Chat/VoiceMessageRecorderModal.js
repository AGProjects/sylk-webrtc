'use strict';

const React = require('react');
const { useEffect, useRef, useState } = React;
const PropTypes = require('prop-types');

const {
    IconButton,
    Popover
} = require('@material-ui/core');
const {
    CancelRounded: CancelIcon
} = require('@material-ui/icons');
const { makeStyles } = require('@material-ui/core/styles');

const { useReactMediaRecorder } = require('react-media-recorder');

const VoiceMessageRecorderRenderer = require('./VoiceMessageRecorderRenderer');


const styleSheet = makeStyles({
    top: {
        position: 'absolute',
        top: -20,
        right: -20
    },
    iconSize: {
        fontSize: '2rem'
    },
    popoverRoot: {
        overflow: 'visible'
    }
});

const VoiceMessageRecorderModal = (props) => {
    const classes = styleSheet();

    const { status, startRecording, stopRecording, previewAudioStream } =
        useReactMediaRecorder({
            video: false,
            mediaRecorderOptions: { mimeType: 'audio/wav' },
            onStop: (t, u) => {
                recordingStopped(t, u)
            }
        });

    const [voiceMessage, setVoiceMessage] = useState(null);
    const [isPreviewStarted, setIsPreviewStarted] = useState(false);

    const shouldUnmount = useRef(true);

    useEffect(() => {
        let ignore = false;
        if (props.show && startRecording && !isPreviewStarted) {
            if (!ignore) {
                setIsPreviewStarted(true);
                startRecording();
            }
        }
        return () => {
            ignore = true;
        }
    }, [startRecording, isPreviewStarted, props.show]);

    const recordingStopped = (blobUrl, blob) => {
        if (shouldUnmount.current !== false) {
            setVoiceMessage(blob);
        } else {
            props.close();
        }
    }

    const handleClose = () => {
        shouldUnmount.current = false;

        if (status !== 'stopped') {
            stopRecording();
        } else {
            props.close();
        }
    }

    return (
        <Popover
            open={props.show}
            onClose={handleClose}
            anchorEl={props.anchorElement}
            anchorOrigin={{
                vertical: 'top',
                horizontal: 'left'
            }}
            transformOrigin={{
                vertical: 'bottom',
                horizontal: 'left'
            }}
            classes={{
                paper: classes.popoverRoot
            }}
            BackdropProps={{ invisible: false, className: 'bd' }}
        >
            <div>
                <VoiceMessageRecorderRenderer
                    height={32}
                    waveColor="rgb(150,150,150)"
                    progressColor="rgb(51, 122, 183)"
                    barWidth={4}
                    barAlign="middle"
                    stopRecording={stopRecording}
                    stream={previewAudioStream}
                    loadData={voiceMessage}
                    normalize={voiceMessage ? true : false}
                    send={() => {
                        props.sendAudioMessage([
                            new File(
                                [voiceMessage],
                                'sylk-audio-recording.' + voiceMessage.type.split(';')[0].split('/')[1] || 'webm',
                                { type: voiceMessage.type }
                            )
                        ]);
                        handleClose();
                    }}
                />
                <IconButton disableRipple={true} disableFocusRipple={true} className={classes.top} onClick={handleClose}>
                    <CancelIcon className={classes.iconSize} />
                </IconButton>
            </div>
        </Popover >

    );
}

VoiceMessageRecorderModal.propTypes = {
    show: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired,
    sendAudioMessage: PropTypes.func.isRequired,
    anchorElement: PropTypes.object.isRequired
};


module.exports = VoiceMessageRecorderModal;
