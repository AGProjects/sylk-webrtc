'use strict';

const React = require('react');
const { useEffect, useState, useRef } = React;
const debug = require('debug');
const PropTypes = require('prop-types');
const cloneDeep = require('lodash/cloneDeep');
const { makeStyles } = require('@material-ui/core/styles');
const { CircularProgress, Toolbar, Divider, Typography } = require('@material-ui/core');
const { IconButton, useMediaQuery } = require('@material-ui/core');

const { default: clsx } = require('clsx');
const ConferenceDrawer = require('./ConferenceDrawer');
const ContactList = require('./Chat/ContactList');
const UserIcon = require('./UserIcon');
const MessageList = require('./Chat/MessageList');
const InfoPanel = require('./Chat/InfoPanel');
const ConferenceChatEditor = require('./ConferenceChatEditor');
const VoiceMessageRecorderModal = require('./Chat/VoiceMessageRecorderModal');

const utils = require('../utils');
const fileTransferUtils = require('../fileTransferUtils');
const ToolbarAudioPlayer = require('./Chat/ToolbarAudioPlayer');

const DEBUG = debug('blinkrtc:Chat');


const styleSheet = makeStyles((theme) => ({
    toolbar: {
        minHeight: '50px',
        height: 50,
        marginBottom: 15
    },
    title: {
        flexGrow: 1,
        display: 'block',
        fontSize: '16px',
        fontFamily: 'inherit'
    },
    centerTitle: {
        display: 'block',
        fontSize: '16px',
        textAlign: 'center',
        fontFamily: 'inherit'
    },
    toolbarName: {
        paddingLeft: 5,
        fontWeight: 'normal',
        color: '#888'
    },
    spacer15: {
        minHeight: '15px',
        height: '15px'
    },
    spacer35: {
        minHeight: '35px',
        height: '35px'
    },
    spacer50: {
        minHeight: '50px',
        height: '50px'
    },
    audioToolbar: {
        width: 'calc(100% - 415px)',
        marginLeft: '415px',
        height: '50px',
        position: 'fixed',
        textAlign: 'left',
        color: '#333',
        zIndex: 9999
    },
    [theme.breakpoints.down('sm')]: {
        audioToolbar: {
            width: '100%',
            margin: 0
        }
    }
}));

const Chat = (props) => {
    const classes = styleSheet(props);
    const [messages, _setMessages] = useState({});
    const [filter, setFilter] = useState('');
    const [unread, setUnread] = useState('');

    const [show, setShow] = useState(false);
    const [focus, setFocus] = useState('');
    const [selectedUri, _setSelectedUri] = useState('');
    const [selectedAudioUri, setSelectedAudioUri] = useState('');
    const [selectedAudioId, setSelectedAudioId] = useState('');
    const [showVoiceMessageRecordModal, setVoiceMessageRecordModal] = useState(false);
    const [showInfoPanel, setShowInfoPanel] = useState(false);

    const selectedUriRef = useRef(selectedUri);
    const messagesRef = useRef(messages);
    const contactCache = useRef(props.contactCache);
    const anchorEl = useRef(null);
    const input = useRef();

    let propagateFocus = false;

    const setSelectedUri = uri => {
        selectedUriRef.current = uri
        _setSelectedUri(uri);
        setShowInfoPanel(false);
    }

    const setMessages = data => {
        messagesRef.current = data
        _setMessages(data);
    }

    const componentJustMounted = useRef(true);

    this.timer = null
    useEffect(() => {
        setSelectedUri(props.focusOn);
    }, [props.focusOn]);

    useEffect(() => {
        const addContact = () => {
            if (props.focusOn) {
                let oldMessages = Object.assign({}, messagesRef.current);
                if (!oldMessages[props.focusOn]) {
                    oldMessages[props.focusOn] = [];
                    setMessages(oldMessages);
                }
            }
        }

        if (show) {
            addContact();
        }
    }, [show, props.focusOn])

    useEffect(() => {
        if (props.account === null) {
            return
        }

        if (props.isLoadingMessages) {
            return
        }

        DEBUG('Loading messages');
        const incomingMessage = (message) => {
            DEBUG('Incoming Message from: %s', message.sender.uri);
            let oldMessages = Object.assign({}, messagesRef.current);
            let hasId = false;
            if (!oldMessages[message.sender.uri]) {
                oldMessages[message.sender.uri] = [];
            } else {
                for (const [key, messages] of Object.entries(oldMessages)) {
                    if (messages.filter(m => m.id == message.id).length > 0) {
                        hasId = true;
                        break;
                    }
                }
            }
            if (hasId) {
                return;
            }

            oldMessages[message.sender.uri].push(message);
            oldMessages[message.sender.uri].sort((a, b) => a.timestamp - b.timestamp);
            if (selectedUriRef.current === message.sender.uri) {
                DEBUG('We have this contact selected');
            }
            setMessages(oldMessages);
        };

        const messageStateChanged = (message) => {
            DEBUG('Message state changed: %o', message);
            let oldMessages = Object.assign({}, messagesRef.current);
            setMessages(oldMessages);
        };

        const outgoingMessage = (message) => {
            if (message.contentType !== 'text/pgp-private-key') {
                const oldMessages = Object.assign({}, messagesRef.current);
                if (!oldMessages[message.receiver]) {
                    oldMessages[message.receiver] = [];
                }
                oldMessages[message.receiver].push(message);
                setMessages(oldMessages);
            }
        };

        const removeMessage = (message) => {
            const oldMessages = cloneDeep(messagesRef.current);
            let key = message.receiver;
            if (message.state === 'received') {
                key = message.sender.uri;
            }
            if (oldMessages[key]) {
                oldMessages[key] = oldMessages[key].filter(loadedMessage => loadedMessage.id !== message.id);
                setMessages(oldMessages);
            }
        };
        const newMessages = cloneDeep(props.oldMessages);
        for (let message of props.account.messages) {
            const senderUri = message.sender.uri;
            const receiver = message.receiver;
            let key = receiver;
            if (message.state === 'received') {
                key = senderUri;
            }
            if (!newMessages[key]) {
                newMessages[key] = [];
            }
            newMessages[key].push(message);
        };

        for (let contact of Object.keys(newMessages)) {
            newMessages[contact].sort((a, b) => a.timestamp - b.timestamp);
        }

        setMessages(newMessages);
        setShow(true);
        props.account.on('incomingMessage', incomingMessage);
        props.account.on('messageStateChanged', messageStateChanged);
        props.account.on('outgoingMessage', outgoingMessage);
        props.account.on('removeMessage', removeMessage);

        componentJustMounted.current = false;
        return () => {
            DEBUG('Running leave hook');
            setShow(false);
            props.account.removeListener('incomingMessage', incomingMessage);
            props.account.removeListener('messageStateChanged', messageStateChanged);
            props.account.removeListener('outgoingMessage', outgoingMessage);
            props.account.removeListener('removeMessage', removeMessage);
        }
    }, [props.account, props.oldMessages, props.isLoadingMessages]);


    const loadMessages = (uri, id) => {
        // Remove entries with 0 messages from contact list
        if (contactMessages.length === 0) {
            const oldMessages = cloneDeep(messagesRef.current);
            delete oldMessages[selectedUri];
            setMessages(oldMessages);
        }

        if (uri !== selectedAudioUri && !selectedAudioUri) {
            setSelectedAudioUri(uri);
        }

        if (uri !== selectedUri) {
            setSelectedUri(uri);
            props.lastContactSelected(uri);
            if (id) {
                DEBUG('Focus message: %s', id);
                setFocus(id);
                setTimeout(() => { setFocus('') }, 750)
            }
        } else {
            DEBUG('Focus message: %s', id);
            setFocus(id);
            setTimeout(() => { setFocus('') }, 750)
        }
    };

    const loadMoreMessages = () => {
        return props.loadMoreMessages(selectedUri);
    };

    const toggleChatEditorFocus = () => {
        props.propagateKeyPress(propagateFocus);
        propagateFocus = !propagateFocus;
    };

    const toggleRecordVoiceMessage = (target) => {
        anchorEl.current = target || null;
        setVoiceMessageRecordModal(!showVoiceMessageRecordModal);
    };

    const filterMessages = () => {
        setFilter(input.current.value);
    }

    const togglePanel = () => {
        setShowInfoPanel(!showInfoPanel)
    }

    const contactMessages = messages[selectedUri] ? [...messages[selectedUri]] : [];
    const contactAudioMessages = messages[selectedAudioUri] ? [...messages[selectedAudioUri]] : [];

    const handleFiles = (e) => {
        DEBUG('Selected files %o', e.target.files);
        fileTransferUtils.upload(props, e.target.files, selectedUri);
        e.target.value = '';
    }

    const handleMessage = (content, type) => {
        let message = props.account.sendMessage(selectedUri, content, type);
        setMessages({ ...messages, [selectedUri]: [...contactMessages, message] });
    };

    const handleDownload = (...args) => {
        let { filename } = args[0];
        let notification = props.notificationCenter().postPreparingFileDownload(filename);

        fileTransferUtils.download(props.account, ...args).then(() => {
            props.notificationCenter().removeNotification(notification);
        }).catch(({ error, filename }) => {
            props.notificationCenter().removeNotification(notification);
            props.notificationCenter().postFileDownloadFailed(filename, error)
        })
    };

    const defaultDomain = props.account.id.substring(props.account.id.indexOf('@') + 1);

    const startChat = () => {
        if (input.current.value !== '') {
            const target = utils.normalizeUri(input.current.value, defaultDomain);
            setSelectedUri(target);
            DEBUG('Starting new chat to: %s', target);
            let oldMessages = cloneDeep(messages);
            if (!oldMessages[target]) {
                oldMessages[target] = [];
            }
            input.current.value = '';
            setFilter('');
            setMessages(oldMessages);
        }
    };

    const selectAudio = (id) => {
        setSelectedAudioUri(selectedUri);
        setSelectedAudioId(id);
    }

    const selectContactAudio = (id, uri) => {
        setSelectedAudioUri(uri);
        setSelectedAudioId(id);
    }

    const resetSelectedAudio = () => {
        setSelectedAudioId('');
        setSelectedAudioUri('');
    }

    const getDisplayName = (uri) => {
        if (props.contactCache.has(uri)) {
            return { uri: uri, displayName: props.contactCache.get(uri) };
        }
        return { uri: uri };
    };

    const matches = useMediaQuery('(max-width:959.95px)');

    const chevronIcon = clsx({
        'fa': true,
        'fa-chevron-left': true
    });

    const messageDisplayed = (uri, id, timestamp, state) => {
        props.account.sendDispositionNotification(
            uri,
            id,
            timestamp,
            state
        );
        if (this.timer !== null) {
            clearTimeout(this.timer);
        }
        this.timer = setTimeout(() => {
            let sendMark = true;
            for (let message of messages[uri]) {
                if (message.state === 'received'
                    && message.dispositionState !== 'displayed'
                    && message.dispositionNotification.indexOf('display') !== -1
                    && message.id !== id
                ) {
                    sendMark = false;
                    break;
                }
            }
            if (sendMark) {
                if (unread === uri) {
                    setUnread()
                } else {
                    setUnread(uri)
                }
                props.account.markConversationRead(uri);
                this.timer = null;
            }
        }, 500);
    };

    const messagePane = (
        <React.Fragment key="pane">
            <MessageList
                loadMoreMessages={loadMoreMessages}
                messages={contactMessages}
                focus={focus}
                key={selectedUri}
                hasMore={() => props.messageStorage.hasMore(selectedUri)}
                contactCache={contactCache.current}
                displayed={messageDisplayed}
                removeMessage={(message) => props.removeMessage(message)}
                isLoadingMessages={props.isLoadingMessages}
                account={props.account}
                uploadFiles={(...args) => fileTransferUtils.upload(props, ...args, selectedUri)}
                downloadFiles={handleDownload}
                embed={props.embed}
            />
            <ConferenceChatEditor
                onSubmit={handleMessage}
                onTyping={() => { }}
                scroll={() => { }}
                focus={toggleChatEditorFocus}
                setFocus={true}
                upload={handleFiles}
                enableVoiceMessage={true}
                toggleRecordVoiceMessage={toggleRecordVoiceMessage}
                multiline
            />
        </React.Fragment>
    );

    const infoPane = (
        <React.Fragment key="infopane">
            <InfoPanel
                key={selectedUri}
                startMessages={contactMessages}
                contactCache={contactCache.current}
                removeMessage={(message) => props.removeMessage(message)}
                account={props.account}
                uploadFiles={(...args) => fileTransferUtils.upload(props, ...args, selectedUri)}
                downloadFiles={handleDownload}
                selectedUri={selectedUri}
                selectAudio={selectAudio}
            />
        </React.Fragment>
    );

    return (
        <React.Fragment>
            {!props.embed &&
                <div className="chat">
                    {selectedAudioId !== '' &&
                        <div style={{ top: selectedUri ? '115px' : '68px' }} className={classes.audioToolbar}>
                            <ToolbarAudioPlayer
                                account={props.account}
                                messages={contactAudioMessages}
                                contactCache={contactCache.current}
                                selectedAudioUri={selectedAudioUri}
                                selectedAudioId={selectedAudioId}
                                close={resetSelectedAudio}
                            />
                        </div>
                    }
                    <ConferenceDrawer
                        show={show && !showInfoPanel && (!matches || selectedUri !== '')}
                        size="full"
                        anchor="right"
                        close={() => setShow(false)}
                        position="full"
                        noBackgroundColor
                        showClose={false}
                        slideProps={{ direction: 'right', unmountOnExit: false }}
                    >

                        {selectedUri &&
                            <Toolbar className={classes.toolbar} style={{ marginLeft: '-15px', marginTop: '-15px', marginRight: '-15px', paddingLeft: '10px', paddingRight: '10px' }}>
                                {matches &&
                                    <button type="button" className="close" onClick={() => setSelectedUri('')}>
                                        <span aria-hidden="true"><i className={chevronIcon} /></span>
                                        <span className="sr-only">Close</span>
                                    </button>
                                }
                                {props.isLoadingMessages === true
                                    ?
                                    <React.Fragment>
                                        <CircularProgress style={{ color: '#888', margin: '5px', marginRight: '10px', width: '35px', height: '35px', display: 'block' }} />
                                        <Typography className={classes.title} variant="h6" noWrap>Updating</Typography>
                                    </React.Fragment>
                                    :
                                    <React.Fragment>
                                        <div style={{ flex: 0 }} onClick={togglePanel}>
                                            <UserIcon identity={getDisplayName(selectedUri)} active={false} small={true} />
                                        </div>
                                        <div onClick={togglePanel} style={{ flex: '1', display: 'flex', alignItems: 'center' }}>
                                            <Typography className={classes.title} variant="h6" noWrap>
                                                {getDisplayName(selectedUri).displayName || selectedUri}
                                                {getDisplayName(selectedUri).displayName && <span className={classes.toolbarName}>({selectedUri})</span>}
                                            </Typography>
                                        </div>
                                        {props.hideCallButtons === false && [
                                            <IconButton key="callButton" className="fa fa-phone" onClick={() => props.startCall(selectedUri, { video: false })} />,
                                            <IconButton key="videoCallButton" className="fa fa-video-camera" onClick={() => props.startCall(selectedUri)} />
                                        ]}
                                    </React.Fragment>
                                }
                                <Divider absolute />
                            </Toolbar>
                        }
                        {selectedAudioId !== '' && <div className={classes.spacer35} />}
                        {selectedUri !== ''
                            ?
                            <React.Fragment>
                                {
                                    props.account.pgp === null &&
                                    <Toolbar className={classes.toolbar} style={{ marginLeft: '-15px', marginTop: '-15px', marginRight: '-15px' }}>
                                        <Typography className={classes.title} variant="h6" noWrap>End to end encryption for messaging is not enabled</Typography>
                                    </Toolbar>
                                }
                                {messagePane}
                            </React.Fragment>
                            :
                            <div style={{ justifyContent: 'center', alignItems: 'center', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div className="chat-image" />
                                <h1 className="cover-heading">No chat selected</h1>
                            </div>
                        }
                    </ConferenceDrawer>
                    <ConferenceDrawer
                        show={show && showInfoPanel && (!matches || selectedUri !== '')}
                        size="full"
                        anchor="right"
                        close={() => setShow(false)}
                        position="full"
                        showClose={false}
                    >
                        {selectedUri &&
                            <Toolbar className={classes.toolbar} style={{ backgroundColor: '#fff', marginLeft: '-15px', marginTop: '-15px', marginRight: '-15px', paddingLeft: '10px', paddingRight: '10px' }}>
                                {props.isLoadingMessages === true
                                    ?
                                    <React.Fragment>
                                        <CircularProgress style={{ color: '#888', margin: '5px', marginRight: '10px', width: '35px', height: '35px', display: 'block' }} />
                                        <Typography className={classes.title} variant="h6" noWrap>Updating</Typography>
                                    </React.Fragment>
                                    :
                                    <React.Fragment>
                                        <div style={{ display: 'flex', flex: '1' }}>
                                            <div style={{ flex: '1' }}>
                                                <button type="button" className="close" style={{ float: 'left', marginRight: '4px' }} onClick={togglePanel}>
                                                    <span aria-hidden="true"><i className={chevronIcon} /></span>
                                                    <span className="sr-only">Back</span>
                                                </button>
                                                <Typography className={classes.title} variant="h6" noWrap>Back</Typography>
                                            </div>
                                            <div style={{ flex: '1 1 auto' }}>
                                                <Typography className={classes.centerTitle} variant="h6" noWrap>
                                                    Info
                                                </Typography>
                                            </div>
                                            <div style={{ flex: '1 0 auto' }}></div>
                                        </div>
                                    </React.Fragment>
                                }
                                <Divider absolute />
                            </Toolbar>
                        }
                        {selectedAudioId !== '' && <div className={classes.spacer35} />}
                        <div className={classes.spacer15} />
                        {selectedUri !== ''
                            ?
                            <React.Fragment>
                                {
                                    props.account.pgp === null &&
                                    <Toolbar className={classes.toolbar} style={{ marginLeft: '-15px', marginTop: '-15px', marginRight: '-15px' }}>
                                        <Typography className={classes.title} variant="h6" noWrap>End to end encryption for messaging is not enabled</Typography>
                                    </Toolbar>
                                }
                                {infoPane}
                            </React.Fragment>
                            :
                            <div style={{ justifyContent: 'center', alignItems: 'center', display: 'flex', flexDirection: 'column', height: '100%' }}>
                                <div className="chat-image" />
                                <h1 className="cover-heading">No chat selected</h1>
                            </div>
                        }
                    </ConferenceDrawer>
                    <ConferenceDrawer
                        show={show && (selectedUri === '' && matches) || !matches}
                        anchor="left"
                        showClose={false}
                        close={() => { }}
                        size="normalWide"
                        noBackgroundColor
                    >
                        {selectedAudioId !== '' && <div className={classes.spacer50} />}
                        <Toolbar className={classes.toolbar} style={{ margin: '-15px -15px 0' }}>
                            <input
                                type="text"
                                id="uri-input"
                                name="uri-input"
                                className="form-control"
                                placeholder="Search or start new chat"
                                ref={input}
                                onChange={filterMessages}
                            />
                            <Divider absolute />
                        </Toolbar>
                        <ContactList
                            messages={messages}
                            loadMessages={loadMessages}
                            startChat={startChat}
                            selectedUri={selectedUri}
                            contactCache={contactCache.current}
                            filter={filter}
                            defaultDomain={defaultDomain}
                            removeChat={(contact) => {
                                props.removeChat(contact);
                                setSelectedUri('');
                            }}
                            unread={unread}
                            downloadFiles={handleDownload}
                            uploadFiles={(...args) => fileTransferUtils.upload(props, ...args)}
                            selectAudio={selectContactAudio}
                        />
                    </ConferenceDrawer>
                </div>
            }
            {props.embed && props.isLoadingMessages == true &&
                <Toolbar className={classes.toolbar} style={{ marginLeft: '-15px', marginTop: '-15px', marginRight: '-15px' }}>
                    <React.Fragment>
                        <CircularProgress style={{ color: '#888', margin: '5px', marginRight: '10px', width: '35px', height: '35px', display: 'block' }} />
                        <Typography className={classes.title} variant="h6" noWrap>Updating</Typography>
                    </React.Fragment>
                    <Divider absolute />
                </Toolbar>
            }
            {props.embed && [messagePane]}
            {showVoiceMessageRecordModal &&
                <VoiceMessageRecorderModal
                    show={showVoiceMessageRecordModal}
                    close={toggleRecordVoiceMessage}
                    contact={selectedUri}
                    anchorElement={anchorEl.current}
                    sendAudioMessage={(...args) => fileTransferUtils.upload(props, ...args, selectedUri)}
                />
            }
        </React.Fragment>
    );
}

Chat.propTypes = {
    account: PropTypes.object.isRequired,
    contactCache: PropTypes.object.isRequired,
    focusOn: PropTypes.string.isRequired,
    loadMoreMessages: PropTypes.func.isRequired,
    messageStorage: PropTypes.object.isRequired,
    oldMessages: PropTypes.object.isRequired,
    propagateKeyPress: PropTypes.func.isRequired,
    removeChat: PropTypes.func.isRequired,
    removeMessage: PropTypes.func.isRequired,
    startCall: PropTypes.func.isRequired,
    lastContactSelected: PropTypes.func.isRequired,
    isLoadingMessages: PropTypes.bool.isRequired,
    sendPublicKey: PropTypes.func.isRequired,
    embed: PropTypes.bool,
    hideCallButtons: PropTypes.bool,
    notificationCenter: PropTypes.func.isRequired
};


module.exports = Chat;
