'use strict';

const React = require('react');
const useEffect = React.useEffect;
const useRef = React.useRef;
const useState = React.useState;

const { default: clsx } = require('clsx');

const PropTypes = require('prop-types');

const debug = require('debug');

const { makeStyles } = require('@material-ui/core/styles');
const { IconButton, Toolbar, CircularProgress, Typography } = require('@material-ui/core');
const {
    SkipPreviousRounded,
    SkipNextRounded,
    Close: CloseIcon
} = require('@material-ui/icons');

const { default: AudioPlayer } = require('react-h5-audio-player');

const { usePrevious, useHasChanged } = require('../../hooks');
const messageStorage = require('../../messageStorage');
const fileTransferUtils = require('../../fileTransferUtils');

const DEBUG = debug('blinkrtc:ToolbarAudioPlayer');


const stylesheet = makeStyles((theme) => ({
    toolbar: {
        minHeight: '50px',
        height: 50,
        marginLeft: '-15px',
        marginTop: '-15px',
        marginRight: '-15px',
        backgroundColor: '#fff'
    },
    title: {
        flexGrow: 1,
        display: 'block',
        fontSize: '16px',
        fontFamily: 'inherit'
    },
    playerText: {
        flex: 1,
        paddingLeft: 10
    },
    playerTextSecondary: {
        color: '#888',
        fontSize: '12px'
    },
    font30: {
        fontSize: '30px'
    },
    progress: {
        color: '#888',
        margin: '5px',
        marginRight: '10px',
        width: '35px',
        height: '35px',
        display: 'block'
    },
    root: {
        borderColor: '#2e6da4',
        color: '#337ab7',
        width: '32px',
        height: '32px',
        margin: '0 3px',
        '&:hover': {
            backgroundColor: '#286090',
            borderColor: '#204d74',
            boxShadow: 'none',
            color: '#fff'
        }
    }
}));

const ToolbarAudioPlayer = (props) => {
    const classes = stylesheet(props);
    const [messages, setMessages] = useState([]);
    const [audioMessages, setAudioMessages] = useState(null)
    const [currentTrack, setTrackIndex] = useState(null)

    const prevMessagesChanged = useHasChanged(props.messages);
    const oldAudioMessages = usePrevious(audioMessages);
    const player = useRef();

    const getDisplayName = React.useCallback((uri) => {
        if (props.contactCache.has(uri)) {
            return { uri: uri, displayName: props.contactCache.get(uri) };
        }
        return { uri: uri };
    }, [props.contactCache]);

    useEffect(() => {
        messageStorage.revertFiles(props.selectedAudioUri);
    }, [props.selectedAudioUri])

    useEffect(() => {
        let ignore = false;
        DEBUG('Attempting to load all messages');

        const loadMore = () => messageStorage.loadMoreFiles(props.selectedAudioUri).then(loadedMessages => {
            DEBUG('Load more files');
            allMessages = [...loadedMessages, ...allMessages];
            canLoadMore();
        });

        const canLoadMore = () => {
            DEBUG('Check if more files can be loaded');
            messageStorage.hasMoreFiles(props.selectedAudioUri).then((value) => {
                if (!value) {
                    if (!ignore) {
                        setMessages(allMessages);
                    }
                } else {
                    loadMore();
                }
            });
        };


        if (!prevMessagesChanged) {
            return;
        }

        let allMessages = [...props.messages];
        canLoadMore();

        return () => {
            ignore = true;
        }
    }, [props.messages, props.selectedAudioUri]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        let ignore = false;

        let newAudioMessages = [];
        messages.filter((message) => {
            return message.contentType === 'application/sylk-file-transfer' && message.json.filetype;
        }).reverse().map((message) => {
            let file = message.json;
            if (file.filename.startsWith('sylk-audio-recording')) {
                newAudioMessages.push(
                    fileTransferUtils.getAndReadFile(props.account, message)
                        .then(([data, filename]) => {
                            return {
                                data: data, filename: filename, id: message.id, contact: message.sender.uri
                            }
                        }).catch(error => {
                            return Promise.reject();
                        })
                )
            }
        })

        Promise.allSettled(newAudioMessages).then(results => {
            let newData = results.filter(result => result.status === 'fulfilled').map(result => result.value)
            if (!ignore) {
                if (JSON.stringify(newData) !== JSON.stringify(oldAudioMessages)) {
                    setAudioMessages(newData);
                }
            }
        });
        return () => {
            ignore = true;
        }
    }, [messages, props.account]); // eslint-disable-line react-hooks/exhaustive-deps


    useEffect(() => {
        let ignore = false;
        if (!audioMessages) {
            return
        }

        if (!ignore) {
            let index = audioMessages.findIndex(data => data.id === props.selectedAudioId);
            if (index >= 0) {
                setTrackIndex(index);
            }
        }
        return () => {
            ignore = true;
        }
    }, [audioMessages, props.selectedAudioId, props.selectedAudioUri])

    const handleClickNext = () => {
        setTrackIndex((currentTrack) =>
            currentTrack < audioMessages.length ? currentTrack - 1 : 0
        );
    };

    const handleClickPrev = () => {
        setTrackIndex((currentTrack) =>
            currentTrack < audioMessages.length ? currentTrack + 1 : 0
        );
    };

    const handleEnd = () => {
        if (currentTrack === 0) {
            props.close();
            return;
        }
        setTrackIndex((currentTrack) =>
            currentTrack - 1
        );
    }

    const previousButton = (
        <IconButton
            disabled={audioMessages && currentTrack === audioMessages.length - 1}
            classes={{ root: classes.root }}
            onClick={handleClickPrev}
        >
            <SkipPreviousRounded className={classes.font30} />
        </IconButton>
    );

    const nextButton = (
        <IconButton
            disabled={currentTrack === 0}
            classes={{ root: classes.root }}
            onClick={handleClickNext}
        >
            <SkipNextRounded className={classes.font30} />
        </IconButton>
    );

    const audioLoaded = audioMessages && audioMessages[currentTrack];

    const playerText = (
        <div className={classes.playerText}>
            {audioLoaded && (getDisplayName(audioMessages[currentTrack].contact).displayName || audioMessages[currentTrack].contact)}<br />
            <span className={classes.playerTextSecondary}>Voice Message</span>
        </div>
    )

    return (
        <Toolbar className={clsx([classes.toolbar, 'audio-toolbar'])}>
            {!audioLoaded ?
                <React.Fragment>
                    <CircularProgress className={classes.progress} />
                    <Typography className={classes.title} variant="h6" noWrap>Loading</Typography>
                </React.Fragment>
                :
                <AudioPlayer
                    style={{
                        width: '100%',
                        boxShadow: 'none',
                        fontSize: 'inherit',
                        background: 'none',
                        marginTop: '-2px'
                    }}
                    customProgressBarSection={
                        [
                            'PROGRESS_BAR'
                        ]
                    }
                    customControlsSection={
                        [
                            previousButton,
                            'MAIN_CONTROLS',
                            nextButton,
                            playerText,
                            <IconButton classes={{ root: classes.root }} onClick={props.close}><CloseIcon style={{ fontSize: '24px' }} /></IconButton>
                        ]
                    }
                    ref={player}
                    layout="stacked-reverse"
                    showSkipControls={false}
                    onLoadedMetaData={() => setTimeout(() => player.current.audio.current.play(), 100)}
                    showJumpControls={false}
                    customVolumeControls={[]}
                    customAdditionalControls={[]}
                    preload="metadata"
                    src={audioLoaded && audioMessages[currentTrack].data}
                    autoPlayAfterSrcChange={false}
                    onEnded={handleEnd}
                />
            }
        </Toolbar >
    )
}

ToolbarAudioPlayer.propTypes = {
    messages: PropTypes.array.isRequired,
    account: PropTypes.object.isRequired,
    close: PropTypes.func.isRequired,
    contactCache: PropTypes.object.isRequired,
    selectedAudioUri: PropTypes.string,
    selectedAudioId: PropTypes.string
};

module.exports = ToolbarAudioPlayer;
