'use strict';

const React = require('react');
const useState = React.useState;
const useEffect = React.useEffect;
const useRef = React.useRef;
const useCallback = React.useCallback;

const {
    CircularProgress,
    IconButton,
    Grid
} = require('@material-ui/core');
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
    }
}));

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

    return wavesurfer
}

const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const secondsRemainder = Math.round(seconds) % 60
    const paddedSeconds = `0${secondsRemainder}`.slice(-2)
    return `${minutes}:${paddedSeconds}`
}

const WaveSurferPlayer = (props) => {
    const classes = styleSheet(props);
    const containerRef = useRef()
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [ready, setReady] = useState(false)
    const wavesurfer = useWavesurfer(containerRef, props)

    const onPlayClick = useCallback(() => {
        wavesurfer.isPlaying() ? wavesurfer.pause() : wavesurfer.play()
    }, [wavesurfer])

    // Initialize wavesurfer when the container mounts
    // or any of the props change
    useEffect(() => {
        if (!wavesurfer) return

        setCurrentTime(0)
        setIsPlaying(false)
        let totalDuration = 0;

        const subscriptions = [
            wavesurfer.on('play', () => setIsPlaying(true)),
            wavesurfer.on('ready', () => setReady(true)),
            wavesurfer.on('pause', () => setIsPlaying(false)),
            wavesurfer.on('decode', (duration) => { totalDuration = duration; setCurrentTime(duration) }),
            wavesurfer.on('timeupdate', (currentTime) => setCurrentTime(totalDuration - currentTime))
        ]

        return () => {
            subscriptions.forEach((unsub) => unsub())
        }
    }, [wavesurfer])

    return (
        <div style={{ display: 'flex', alignItems: 'center', height: '70px' }}>
            <Grid container spacing={2} style={{ ...!ready ? { opacity: 0, display: 'none' } : { animation: 'fadeIn ease .5s' } }}>
                <Grid item >
                    <IconButton onClick={onPlayClick} classes={{ root: classes.root }}>
                        {isPlaying ?
                            <StopIcon style={{ fontSize: '3rem' }} />
                            :
                            <PlayIcon style={{ fontSize: '3rem' }} />
                        }
                    </IconButton>
                </Grid>
                <Grid item>
                    <Grid container spacing={1} direction="column">
                        <Grid item>
                            <div ref={containerRef} style={{ whiteSpace: 'normal', width: '150px' }} />
                        </Grid>
                        <Grid item>
                            {formatTime(currentTime)}
                        </Grid>
                    </Grid>
                </Grid>
            </Grid>
            {!ready && <CircularProgress style={{ color: '#999' }} />}
        </div>
    )
}

module.exports = WaveSurferPlayer;
