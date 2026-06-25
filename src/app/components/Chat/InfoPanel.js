'use strict';

const React = require('react');
const useEffect = React.useEffect;
const useRef = React.useRef;
const useState = React.useState;
const PropTypes = require('prop-types');
const debug = require('debug');

const { DateTime } = require('luxon');
const { useInView } = require('react-intersection-observer');
const { resolveMime } = require('friendly-mimes');

const { makeStyles } = require('@material-ui/core/styles');
const {
    Box,
    CircularProgress,
    IconButton,
    ImageList,
    ImageListItem,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Paper,
    Typography,
    useMediaQuery
} = require('@material-ui/core');
const {
    PlayArrowRounded,
    DescriptionOutlined: FileIcon
} = require('@material-ui/icons');

const UserIcon = require('../UserIcon');
const DragAndDrop = require('../DragAndDrop');
const ImagePreviewModal = require('./ImagePreviewModal')

const ListWithStickyHeader = require('../ListWithStickyHeader');
const TabPanel = require('../TabPanel');

const { Tabs, Tab } = require('../../MaterialUIAsBootstrap');
const { usePrevious, useResize, useHasChanged } = require('../../hooks');
const fileTransferUtils = require('../../fileTransferUtils');
const messageStorage = require('../../messageStorage');
const { useAddressbook } = require('../../AddressbookProvider');
const ContactDetails = require('./ContactDetails').default;


const DEBUG = debug('blinkrtc:InfoPanel');

const formatTime = (fileDate) => {
    const date = DateTime.fromJSDate(fileDate);
    return date.toLocaleString(DateTime.DATETIME_MED);
};

const formatListTime = (message) => {
    const date = DateTime.fromJSDate(message.timestamp);
    return date.toFormat('MMMM yyyy');
};

const groupByMonth = (xs) => {
    return xs.reduce((rv, x) => {
        let key = formatListTime(x);
        (rv[key] = rv[key] || []).push(x);
        return rv;
    }, {});
};

const groupImagesByMonth = (xs) => {
    return xs.reduce((rv, x) => {
        let key = formatListTime(x.message);
        (rv[key] = rv[key] || []).push(x);
        return rv;
    }, {});
};

const fileSize = (size) => {
    let i = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(1) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

const fileInfo = (fileData) => {
    let filetype = 'Unknown';
    if (fileData.filetype) {
        try {
            filetype = resolveMime(fileData.filetype).name;
        }
        catch (error) {
            filetype = fileData.filetype;
            // no op
        }
    }
    return `${fileSize(fileData.filesize)} - ${filetype} - ${formatTime(fileData.timestamp)}`
}

const formatDuration = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
};

const a11yProps = (index) => {
    return {
        id: `tab-${index}`,
        'aria-controls': `tabpanel-${index}`
    };
}

const styleSheet = makeStyles((theme) => ({
    item: {
        fontSize: '14px',
        fontFamily: 'inherit',
        color: '#333',
        minHeight: 0,
        fontWeight: '600'
    },
    secondary: {
        fontSize: '12px',
        fontFamily: 'inherit',
        color: '#666',
        minHeight: 0
    },
    fixFont: {
        fontFamily: 'inherit',
        fontSize: '12px'
    },
    center: {
        display: 'block',
        textAlign: 'center',
        marginTop: '4px',
        marginBottom: '20px',
        fontFamily: 'inherit'
    },
    root: {
        borderColor: '#2e6da4',
        backgroundColor: '#337ab7',
        color: '#fff',
        width: '42px',
        height: '42px',
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

const InfoPanel = ({
    startMessages,
    removeMessage,
    account,
    uploadFiles,
    downloadFiles,
    selectedContact,
    selectAudio,
    editContact,
    setEdit,
    saveContactRef,
    onContactError,
    notificationCenter,
    removeChat
}) => {
    const classes = styleSheet();

    const { addressbook, actions, lookup } = useAddressbook();

    const [images, setImages] = useState(null)
    const [voiceMessages, setVoiceMessages] = useState(null)
    const [files, setFiles] = useState(null)
    const [display, setDisplay] = useState(false);
    const [value, setValue] = React.useState(0);
    const [loading, setLoading] = useState(false);
    const [more, setMore] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [noFilesFound, setNoFilesFound] = useState(false);
    const [image, setImage] = useState('');
    const [messages, setMessages] = useState(startMessages);
    const [message, setMessage] = useState({});

    const [panel, width, height] = useResize();
    const { ref, inView, entry } = useInView({
        threshold: 0
    });

    const prevMessagesChanged = useHasChanged(messages);
    const oldImages = usePrevious(images || []);
    const oldVoiceMessages = usePrevious(voiceMessages || []);
    const oldFiles = usePrevious(files || []);

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    const matches = useMediaQuery('(max-width:1059.95px)');

    const getImage = (message) => {
        fileTransferUtils.getAndReadFile(account, message).then(([imageData, filename]) => {
            setImage(imageData)
            message.filename = filename;
            setMessage(message)
            setShowModal(true)
        })
    }

    const getContact = (message) => {
        const contactUri = message.state === 'received' ? message.sender.uri : message.receiver;
        const contact = lookup(contactUri);

        return contact?.name || contact?.identity?.displayName || contactUri;
    };

    const getFilename = (json) => {
        return json.filename.replace('.asc', '').replace(/_/g, ' ');
    }

    const getFileList = (files) => {
        let first = true;
        const sortedFiles = groupByMonth(files);

        return Object.keys(sortedFiles).map(key => {
            if (first) {
                first = false
                return (
                    <Paper key={`files-${key}`} elevation={0} style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                        <Box p={0}>
                            <List>
                                {
                                    sortedFiles[key].map((message) => (
                                        <ListItem key={`file-${message.id}`} button onClick={() => downloadFiles(message.json)}>
                                            <ListItemIcon>
                                                <FileIcon className={classes.fixFont} style={{ fontSize: '24px' }} />
                                            </ListItemIcon>
                                            <ListItemText classes={{ primary: classes.item, secondary: classes.secondary }} primary={getFilename(message.json)} secondary={fileInfo(message.json)} />
                                        </ListItem>
                                    ))
                                }
                            </List>
                        </Box>
                    </Paper>
                )
            }
            return (
                <ListWithStickyHeader key={`files-${key}`} header={<Typography className={classes.fixFont} style={{ padding: '4px', fontSize: 16, fontWeight: 300 }} variant="subtitle1">{key}</Typography>}>
                    <Paper elevation={0}>
                        <Box p={0}>
                            <List>
                                {
                                    sortedFiles[key].map((message) => (
                                        <ListItem key={`file-${message.id}`} button onClick={() => downloadFiles(message.json)}>
                                            <ListItemIcon>
                                                <FileIcon className={classes.fixFont} style={{ fontSize: '24px' }} />
                                            </ListItemIcon>
                                            <ListItemText classes={{ primary: classes.item, secondary: classes.secondary }} primary={getFilename(message.json)} secondary={fileInfo(message.json)} />
                                        </ListItem>
                                    ))
                                }
                            </List>
                        </Box>
                    </Paper>
                </ListWithStickyHeader>
            )
        })
    }

    const getImageList = (images) => {
        let first = true;
        const sortedFiles = groupImagesByMonth(images);

        const calculateHeight = width !== 0 ? matches ? (width - 4) / 3 : (width - 6) / 4 : 200;

        return Object.keys(sortedFiles).map(key => {
            if (first) {
                first = false
                return (
                    <Paper key="images-first-month" elevation={0} style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                        <ImageList rowHeight={calculateHeight} gap={2} cols={matches ? 3 : 4} >
                            {
                                sortedFiles[key].map((entry) => (
                                    <ImageListItem key={`img-${entry.message.id}-${entry.filename}`} cols={1} onClick={() => getImage(entry.message)}>
                                        <img src={entry.image} />
                                        {entry.duration &&
                                            <span style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 11, padding: '1px 4px', borderRadius: 3 }}>
                                                {formatDuration(entry.duration)}
                                            </span>
                                        }
                                    </ImageListItem>
                                ))
                            }
                        </ImageList>
                    </Paper>
                )
            }
            return (
                <ListWithStickyHeader key={`images-${key}`} header={<Typography className={classes.fixFont} style={{ padding: '4px', fontSize: 16, fontWeight: 300 }} variant="subtitle1">{key}</Typography>}>
                    <Paper elevation={0}>
                        <ImageList rowHeight={calculateHeight} gap={2} cols={matches ? 3 : 4} >
                            {
                                sortedFiles[key].map((entry) => (
                                    <ImageListItem key={`${entry.message.id}-${entry.filename}`} cols={1} onClick={() => getImage(entry.message)}>
                                        <img src={entry.image} />
                                        {entry.duration &&
                                            <span style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(0,0,0,0.6)', color: 'white', fontSize: 11, padding: '1px 4px', borderRadius: 3 }}>
                                                {formatDuration(entry.duration)}
                                            </span>
                                        }
                                    </ImageListItem>
                                ))
                            }
                        </ImageList>
                    </Paper>
                </ListWithStickyHeader>
            )
        })
    }

    const getAudioList = (files) => {
        let first = true;
        const sortedFiles = groupByMonth(files);

        return Object.keys(sortedFiles).map(key => {
            if (first) {
                first = false
                return (
                    <Paper key={`vm-${key}`} elevation={0} style={{ borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                        <Box p={0}>
                            <List>
                                {
                                    sortedFiles[key].map((message) => (
                                        <ListItem key={`vm-${message.id}`}>
                                            <ListItemIcon>
                                                <IconButton component="span" onClick={() => selectAudio(message)} classes={{ root: classes.root }}><PlayArrowRounded style={{ fontSize: '3rem' }} /></IconButton>
                                            </ListItemIcon>
                                            <ListItemText classes={{ primary: classes.item, secondary: classes.secondary }} primary={formatTime(message.json.timestamp)} secondary={getContact(message)} />
                                        </ListItem>
                                    ))
                                }
                            </List>
                        </Box>
                    </Paper >
                )
            }
            return (
                <ListWithStickyHeader key={`vm-${key}`} header={<Typography className={classes.fixFont} style={{ padding: '4px', fontSize: 16, fontWeight: 300 }} variant="subtitle1">{key}</Typography>}>
                    <Paper elevation={0}>
                        <Box p={0}>
                            <List>
                                {
                                    sortedFiles[key].map((message) => (
                                        <ListItem key={`vm-${message.id}`} >
                                            <ListItemIcon>
                                                <IconButton component="span" onClick={() => selectAudio(message)} classes={{ root: classes.root }}><PlayArrowRounded style={{ fontSize: '3rem' }} /></IconButton>
                                            </ListItemIcon>
                                            <ListItemText classes={{ primary: classes.item, secondary: classes.secondary }} primary={formatTime(message.json.timestamp)} secondary={getContact(message)} />
                                        </ListItem>
                                    ))
                                }
                            </List>
                        </Box>
                    </Paper>
                </ListWithStickyHeader>
            )
        })
    }

    const loadMore = React.useCallback(() => {
        DEBUG('Attempting to load more messages');
        setLoading(true);
        setMore(false);
        messageStorage.loadMoreFiles(selectedContact.defaultUri.uri).then(loadedMessages => {
            if (loadedMessages) {
                setMessages([...loadedMessages, ...messages]);
            }
            busy.current = false;
        });
    }, [messages, selectedContact]);

    useEffect(() => {
        if (!prevMessagesChanged) {
            return;
        }
        DEBUG('Entries changed, updating entries');
        let ignore = false;

        let cacheResults = []
        let newVoiceMessages = [];
        let newFiles = [];

        messages.filter((message) => {
            return message.contentType === 'application/sylk-file-transfer' && message.json.filetype;
        }).reverse().map((message) => {
            let file = message.json;
            if (file.filetype.startsWith('image/') || file.filetype.startsWith('video/')) {
                cacheResults.push(fileTransferUtils.generateThumbnail(account, message)
                    .then(([image, filename, w, h, duration]) => {
                        return {
                            image: image, filename: filename, width: w, height: h, duration, message: message
                        }
                    }).catch(error => {
                        return Promise.reject()
                    }))
            } else if (file.filename.startsWith('sylk-audio-recording')) {
                newVoiceMessages.push(message);
            } else {
                newFiles.push(message);
            }
        })

        if (newVoiceMessages.length === 0 && newFiles.length === 0 && cacheResults.length === 0) {
            DEBUG('No messages, checking for more');
            messageStorage.hasMoreFiles(selectedContact.defaultUri.uri).then((value) => {
                setMore(value);
                if (!value) {
                    setNoFilesFound(!value);
                }
            });
            return;
        }
        if (!ignore) {
            if (JSON.stringify(newFiles) !== JSON.stringify(oldFiles)) {
                setFiles(newFiles);
            }
            if (JSON.stringify(newVoiceMessages) !== JSON.stringify(oldVoiceMessages)) {
                setVoiceMessages(newVoiceMessages);
            }
        }
        Promise.allSettled(cacheResults).then(results => {
            let newData = results.filter(result => result.status === 'fulfilled').map(result => result.value);
            if (!ignore) {
                if (JSON.stringify(newData) !== JSON.stringify(oldImages)) {
                    setImages(newData)
                }
            }
        });
        return () => {
            ignore = true;
        }
    }, [messages, removeMessage, account, selectedContact]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        setMessages(startMessages);
    }, [startMessages]);

    useEffect(() => {
        return () => {
            messageStorage.revertFiles(selectedContact.defaultUri.uri);
        }
    }, [selectedContact])

    const busy = useRef(false);
    const activeRef = useRef(true);

    useEffect(() => {
        return () => {
            activeRef.current = false;
        };
    }, []);

    useEffect(() => {
        let timer;
        const canLoadMore = () => {
            DEBUG('Checking if more can be loaded');
            messageStorage.hasMoreFiles(selectedContact.defaultUri.uri).then((value) => {
                setMore(value);
            });
        };
        if (busy.current) {
            return;
        }
        let load = images || files || voiceMessages;
        if (load) {
            busy.current = true;
        }
        if (load && display !== true) {
            canLoadMore();
            timer = setTimeout(() => {
                if (!activeRef.current) {
                    return
                }
                setDisplay(true);
            }, 150);
        }
        if (load && loading === true) {
            canLoadMore();
            setLoading(false);
            if (more && inView) {
                loadMore();
            }
        }
    }, [images, files, voiceMessages, inView, display]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        DEBUG('Bottom is now %s', inView ? 'visible' : 'hidden');
        if (inView) {
            loadMore();
        }
    }, [inView, loadMore]);

    return (
        <div
            className="drawer-chat"
            ref={panel}
            style={{
                margin: 0,
                alignSelf: 'center',
                maxWidth: '806px',
                overflow: 'visible',
                flex: 1,
                width: '100%'
            }}
        >
            <ImagePreviewModal
                show={showModal}
                close={() => setShowModal(false)}
                image={image}
                message={message}
                openInNewTab={(...args) => fileTransferUtils.openInNewTab(account, ...args)}
                download={downloadFiles}
                removeMessage={removeMessage}
            />
            <DragAndDrop title="Drop files to share them" handleDrop={uploadFiles} marginTop={'100px'} style={{ height: '100%', flexDirection: 'column'}} useFlex>
                <UserIcon identity={selectedContact.identity} active={false} large={true} />
                <ContactDetails
                    key={selectedContact.id}
                    contact={selectedContact}
                    editContact={editContact}
                    setEdit={setEdit}
                    ref={saveContactRef}
                    onError={onContactError}
                    notificationCenter={notificationCenter}
                    removeChat={removeChat}
                />
                {display && !editContact &&
                    <React.Fragment>
                        <Paper
                            elevation={0}
                            style={{
                                borderBottomLeftRadius: 0,
                                borderBottomRightRadius: 0,
                                position: 'sticky',
                                top: 0,
                                zIndex: 1000,
                                background: '#fff'
                            }}
                        >
                            <Tabs
                                value={value}
                                indicatorColor="primary"
                                textColor="primary"
                                onChange={handleChange}
                                aria-label="disabled tabs example"
                                centered
                            >
                                {images && <Tab label="Media" {...a11yProps(0)} />}
                                {files && <Tab label="Files" {...a11yProps(1)} />}
                                {voiceMessages && <Tab label="Voice" {...a11yProps(2)} />}
                            </Tabs>
                        </Paper>
                        {images &&
                            <TabPanel
                                style={{ flex: 1}}
                                value={value} index={0}
                            >
                                {getImageList(images)}
                            </TabPanel>
                        }
                        {files &&
                            <TabPanel
                                style={{ flex: 1 }}
                                value={value} index={images ? 1 : 0}
                            >
                                {getFileList(files)}
                            </TabPanel>
                        }
                        {voiceMessages &&
                            <TabPanel
                                style={{ flex: 1 }}
                                value={value} index={images && files ? 2 : (files || images) ? 1 : 0}
                            >
                                {getAudioList(voiceMessages)}
                            </TabPanel>
                        }
                    </React.Fragment>
                }
                {!display && !editContact &&
                    <Box p={0} style={{ flex: 1 }}>
                        {noFilesFound &&
                            <Typography className={classes.center} variant="h5" noWrap>
                                No shared media, files and voice messages.
                            </Typography>
                        }
                    </Box>
                }
                {editContact &&
                    <Box p={0} style={{ flex: 1 }}>
                    </Box>
                }
            </DragAndDrop>
            {
                more === true && display === true &&
                <div ref={ref}>
                    <CircularProgress style={{ color: '#888', margin: 'auto', display: 'block' }} />
                </div>
            }
        </div >
    );
};

InfoPanel.propTypes = {
    startMessages: PropTypes.array,
    removeMessage: PropTypes.func.isRequired,
    removeChat: PropTypes.func.isRequired,
    account: PropTypes.object.isRequired,
    uploadFiles: PropTypes.func,
    downloadFiles: PropTypes.func,
    selectedContact: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    selectAudio: PropTypes.func,
    editContact: PropTypes.bool,
    notificationCenter: PropTypes.func.isRequired,
    onContactError: PropTypes.func.isRequired,
    setEdit: PropTypes.func.isRequired,
    saveContactRef: PropTypes.object.isRequired
};


module.exports = InfoPanel;
