'use strict';

const React = require('react');
const {
    useCallback,
    useEffect,
    useRef,
    useState
} = React;
const PropTypes = require('prop-types');

const {
    IconButton,
    Grid,
    CircularProgress
} = require('@material-ui/core');
import {
    green,
    orange
} from '@material-ui/core/colors';
const {
    PlayArrowRounded: PlayIcon,
    StopRounded: StopIcon
} = require('@material-ui/icons');
const { makeStyles } = require('@material-ui/core/styles');

const { default: WaveSurfer } = require('wavesurfer.js');


const styleSheet = makeStyles((theme) => ({
    root: {
        backgroundColor: '#337ab7',
        borderColor: '#2e6da4',
        color: '#fff',
        width: '32px',
        height: '32px',
        '&:hover': {
            backgroundColor: '#286090',
            borderColor: '#204d74',
            boxShadow: 'none'
        },
        '&:focus': {
            borderColor: '#122b40',
            backgroundColor: '#204d74',
            outlineOffset: '-2px',
            boxShadow: 'inset 0px 3px 5px 0px rgba(0,0,0,.125)'
        }
    },
    wrapper: {
        position: 'relative'
    },
    stopButton: {
        backgroundColor: orange[400],
        '&:hover': {
            backgroundColor: orange['A400']
        }
    },
    sendButton: {
        backgroundColor: '#5cb85c',
        borderColor: '#4cae4c',
        '&:hover': {
            backgroundColor: '#449d44',
            borderColor: '#398439'
        },
        '&:focus': {
            borderColor: '#255625',
            backgroundColor: '#449d44'
        }

    },
    progress: {
        color: green[300],
        position: 'absolute',
        top: -4,
        left: -4,
        zIndex: 1
    }
}));

const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const secondsRemainder = Math.round(seconds) % 60
    const paddedSeconds = `0${secondsRemainder}`.slice(-2)
    return `${minutes}:${paddedSeconds}`
}

const useInterval = (callback, delay) => {
    const savedCallback = useRef();
    const [cancel, setCancel] = useState(false);

    // Remember the latest callback.
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the interval.
    useEffect(() => {
        function tick() {
            savedCallback.current();
        }
        if (delay !== null && !cancel) {
            let id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay, cancel]);

    const stop = () => setCancel(true);

    return [stop]
}

const useWavesurfer = (containerRef, options) => {
    const [wavesurfer, setWavesurfer] = useState(null)

    // Initialize wavesurfer when the container mounts
    // or any of the props change
    useEffect(() => {
        if (!containerRef.current) return

        const ws = WaveSurfer.create({
            ...options,
            container: containerRef.current
        })
        setWavesurfer(ws)

        return () => {
            ws.destroy()
        }
    }, [options, containerRef])

    return [wavesurfer]
}

const VoiceMessageRecorderRenderer = (props) => {
    const classes = styleSheet(props);
    const containerRef = useRef()
    const sendRef = useRef(null);

    const [isPlaying, setIsPlaying] = useState(false)
    const [canPlay, setCanPlay] = useState(false)
    const [isRecording, setIsRecording] = useState(true)
    const [currentTime, setCurrentTime] = useState(0)
    const [seconds, setSeconds] = useState(0);

    const [wavesurfer] = useWavesurfer(containerRef, props)
    const [stopTimer] = useInterval(() => {
        setSeconds(seconds + 1);
        if (seconds === maxDuration) {
            stopTimer();
            props.stopRecording()
        }
    }, 1000);

    const stopRecording = props.stopRecording;

    const onPlayClick = useCallback(() => {
        if (!canPlay) {
            stopRecording();
            return;
        }
        wavesurfer.isPlaying() ? wavesurfer.pause() : wavesurfer.play()
    }, [wavesurfer, canPlay, stopRecording])

    const maxDuration = 100;

    useEffect(() => {
        if (canPlay) {
            sendRef.current.focus()
        }
    }, [canPlay])

    useEffect(() => {
        if (!wavesurfer) return

        let totalDuration = 0;
        setIsPlaying(false)

        if (props.loadData) {
            setIsRecording(false)
            setCanPlay(true);
            wavesurfer.loadBlob(props.loadData)
            stopTimer();
            const subscriptions = [
                wavesurfer.on('play', () => setIsPlaying(true)),
                wavesurfer.on('pause', () => setIsPlaying(false)),
                wavesurfer.on('decode', (duration) => { totalDuration = duration; setCurrentTime(duration) }),
                wavesurfer.on('timeupdate', (currentTime) => setCurrentTime(totalDuration - currentTime))
            ]
            return () => {
                subscriptions.forEach((unsub) => unsub())
            }
        }

        if (!props.stream) return;
        if (props.stream.getTracks().length === 0) return;

        setIsRecording(true)

        let stream = props.stream

        const audioContext = new AudioContext()
        const source = audioContext.createMediaStreamSource(stream)
        const analyser = audioContext.createAnalyser()
        source.connect(analyser)

        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Float32Array(bufferLength)
        const sampleDuration = bufferLength / audioContext.sampleRate

        let animationId;

        const drawWaveform = () => {
            analyser.getFloatTimeDomainData(dataArray)

            wavesurfer.options.cursorWidth = 0
            wavesurfer.options.interact = false
            wavesurfer.load('', [dataArray], sampleDuration)
            animationId = requestAnimationFrame(drawWaveform)
        }

        drawWaveform()
        return () => {
            cancelAnimationFrame(animationId)
            source.disconnect()
            audioContext.close()
        }
    }, [wavesurfer, stopTimer, props.stream, props.loadData])

    return (
        <Grid container direction="column" spacing={1} style={{ padding: '8px' }}>
            <Grid item>
                <Grid container spacing={0}>
                    <Grid item>
                        <div ref={containerRef} style={{ whiteSpace: 'normal', width: '150px' }} />
                    </Grid>
                    <Grid item style={{ paddingLeft: '2px', lineHeight: '32px' }}>
                        {canPlay ? formatTime(currentTime) : formatTime(seconds)}
                    </Grid>
                </Grid>
            </Grid>
            <Grid item >
                <Grid container justifyContent="center" spacing={1}>
                    <Grid item>
                        {isRecording || isPlaying ?
                            <div className={classes.wrapper}>
                                <IconButton onClick={onPlayClick} className={classes.stopButton} classes={{ root: classes.root }}>
                                    <StopIcon style={{ fontSize: '2rem' }} />
                                    <CircularProgress size={40} variant="determinate" value={(seconds / maxDuration) * 100} className={classes.progress} />
                                </IconButton>
                            </div>
                            :
                            <IconButton onClick={onPlayClick} classes={{ root: classes.root }}>
                                <PlayIcon style={{ fontSize: '2rem' }} />
                            </IconButton>
                        }
                    </Grid>
                    {canPlay &&
                        <Grid item>
                            <IconButton ref={sendRef} onClick={props.send} className={classes.sendButton} classes={{ root: classes.root }}>
                                <i className="fa fa-paper-plane" aria-hidden="true" ></i>
                            </IconButton>
                        </Grid>
                    }
                </Grid>
            </Grid>
        </Grid >
    )
}

VoiceMessageRecorderRenderer.propTypes = {
    stopRecording: PropTypes.func.isRequired,
    send: PropTypes.func.isRequired,
    loadData: PropTypes.object,
    stream: PropTypes.object
};

module.exports = VoiceMessageRecorderRenderer;
