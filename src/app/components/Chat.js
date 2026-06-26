'use strict';

const React = require('react');
const { useEffect, useState, useRef } = React;
const debug = require('debug');
const PropTypes = require('prop-types');
const { cloneDeep, isEqual } = require('lodash');
const { makeStyles } = require('@material-ui/core/styles');
const { CircularProgress, Toolbar, Divider, Typography, Grid } = require('@material-ui/core');
const { IconButton, useMediaQuery } = require('@material-ui/core');

const { default: clsx } = require('clsx');
const ConferenceDrawer = require('./ConferenceDrawer');
const ContactList = require('./Chat/ContactList');
const UserIcon = require('./UserIcon');
const MessageList = require('./Chat/MessageList');
const InfoPanel = require('./Chat/InfoPanel');
const ConferenceChatEditor = require('./ConferenceChatEditor');
const VoiceMessageRecorderModal = require('./Chat/VoiceMessageRecorderModal');
const ToolbarAudioPlayer = require('./Chat/ToolbarAudioPlayer');

const FileUploadModal = require('./FileUploadModal').default;
const ContactDeleteModal = require('./ContactDeleteModal').default;

const fileTransferUtils = require('../fileTransferUtils');
const messageStorage = require('../messageStorage');
const utils = require('../utils');

const { useAddressbook } = require('../AddressbookProvider');
const { useConfig } = require('../ConfigProvider')


const DEBUG = debug('blinkrtc:Chat');

const { isNodeEmitter } = require('../utils');

function enrichWithMetadata(message) {
    if (message.metadata.length > 0) {
        return Promise.resolve(message);
    }

    return messageStorage.getMetadata(message.id).then(metadata => {
        if (metadata) {
            metadata = metadata.map(meta => {
                if (meta.snapshot) {
                    meta.snapshot = messageStorage.fixMessage(meta.snapshot);
                }
                return meta;
            });
            message._metadata = metadata;
        }
        return message;
    });
}

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
    },
    infoToolbarButton: {
        display: 'flex',            // makes content a flex row
        alignItems: 'center',       // vertically centers text
        justifyContent: 'center',
        padding: '0 8px',           // remove default button padding
        height: '36px',             // match typical MUI IconButton height
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 16,
        lineHeight: 1,
        '&:hover': {
            textDecoration: 'none' // removes underline on hover
        }
    }

}));

const Chat = (props) => {
    const classes = styleSheet(props);
    const [messages, _setMessages] = useState({});
    const [filter, setFilter] = useState('');
    const [calcUnread, setCalcUnread] = useState('');

    const { addressbook, actions, lookup, onError } = useAddressbook();

    const [show, setShow] = useState(false);
    const [focus, setFocus] = useState('');
    const [upload, setUpload] = useState(null);
    const [selectedContact, _setSelectedContact] = useState(null);
    const [deleteContact, setDeleteContact] = useState(null);

    const [selectedAudioMessage, setSelectedAudioMessage] = useState(null);
    const [showVoiceMessageRecordModal, setVoiceMessageRecordModal] = useState(false);
    const [showInfoPanel, setShowInfoPanel] = useState(false);
    const [editContact, setEditContact] = useState(false);
    const [editMessage, setEditMessage] = useState('');
    const [contactHasError, setContactHasError] = useState(false);
    const [newContacts, setNewContacts] = useState([]);
    const { domain } = useConfig();
    const selectedContactRef = useRef(selectedContact);
    const messagesRef = useRef(messages);
    const anchorEl = useRef(null);
    const input = useRef();
    const saveContactRef = useRef(null);

    const { notificationCenter } = props;

    let propagateFocus = false;

    const setSelectedContact = uri => {
        setShowInfoPanel(false);
        selectedContactRef.current = uri
        _setSelectedContact(uri);
    }

    const setMessages = data => {
        messagesRef.current = data
        _setMessages(data);
    }

    const componentJustMounted = useRef(true);

    let timer = null

    useEffect(() => {
        if (!props.focusOn || props.focusOn === '') return;

        const contact = lookup(props.focusOn);
        if (selectedContactRef.current !== contact) {
            DEBUG('Setting selectedContact from lookup: %s -> %o', props.focusOn, contact);
            setSelectedContact(contact);
        } else {
            DEBUG('focusOn contact unchanged, skipping update: %s', props.focusOn);
        }
        const inAddressbook = addressbook.contacts.get(contact.defaultUri.uri)?.length > 0;
        if (!inAddressbook) {
            setNewContacts(prev =>
                prev.some(c => c.id === contact.id) ? prev : [{ ...contact, _isNew: true }, ...prev]
            );
        }
    }, [props.focusOn, addressbook.contacts, lookup]);

    useEffect(() => {
        const unsubscribe = onError((err) => {
            if (err.action === 'delete' && !showInfoPanel) {
                setDeleteContact(null);
                notificationCenter().postDeleteContactFailed(err);
            }
        });
        return unsubscribe;
    }, [showInfoPanel, onError, notificationCenter]);

    useEffect(() => {
        if (!selectedContactRef.current) return;
        const updated = [...addressbook.contacts.values()]
        .flat()
        .find(c => c.id === selectedContactRef.current.id);

        DEBUG('addressbook effect, updated: %o', updated);
        if (updated) {
            if (!isEqual(updated, selectedContactRef.current)) {
                _setSelectedContact(updated);
                selectedContactRef.current = updated;
            }
        }
    }, [addressbook.contacts]);

    const isElectron = navigator.userAgent.includes('Electron');

    useEffect(() => {
        if (props.account === null && isElectron) {
            DEBUG('Loading messages with electron and no account');
            const newMessages = cloneDeep(props.oldMessages);

            for (let contact of Object.keys(newMessages)) {
                newMessages[contact].sort((a, b) => a.timestamp - b.timestamp);
            }
            setMessages(newMessages);
            setShow(true);
            return
        }

        if (props.account === null) {
            return
        }

        DEBUG('Loading messages');
        const incomingMessage = (message) => {
            DEBUG('Incoming Message from: %s', message.sender.uri);
            if (message.contentType === 'text/pgp-public-key-imported') {
                return;
            }

            if (message.contentType === 'application/sylk-message-metadata') {
                if (message.jsonError || !message.json || !message.json.messageId) return;

                if (message.json.action === 'reply' && message.json.value) {
                    for (const msgs of Object.values(messagesRef.current)) {
                        const original = msgs.find(m => m.id === message.json.value);
                        if (original) {
                            message.json.snapshot = original;
                            break;
                        }
                    }
                }

                const oldMessages = Object.assign({}, messagesRef.current);
                for (const [key, messages] of Object.entries(oldMessages)) {
                    const idx = messages.findIndex(m => m.id === message.json.messageId);
                    if (idx !== -1) {
                        const existing = messages[idx].metadata || [];
                        const metaIdx = existing.findIndex(m => m.action === message.json.action);
                        if (metaIdx !== -1) {
                            existing[metaIdx] = message.json;
                        } else {
                            existing.push(message.json);
                        }
                        setMessages(oldMessages);
                        break;
                    }
                }
                return;
            }

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
            const key = message.sender.uri;
            enrichWithMetadata(message).then(enriched => {
                oldMessages[key].push(enriched);
                oldMessages[key].sort((a, b) => a.timestamp - b.timestamp);
                if (selectedContactRef.current?.uris?.[0]?.uri === message.sender.uri) {
                    DEBUG('We have this contact selected');
                }
                setMessages(oldMessages);
            });
        };

        const messageStateChanged = (message) => {
            DEBUG('Message state changed: %o', message);
            let oldMessages = Object.assign({}, messagesRef.current);
            setMessages(oldMessages);
        };

        const outgoingMessage = (message) => {
            if (message.contentType === 'text/pgp-private-key' || message.contentType === 'application/sylk-message-metadata') {
                return;
            }
            const oldMessages = Object.assign({}, messagesRef.current);
            if (!oldMessages[message.receiver]) {
                oldMessages[message.receiver] = [];
            }
            enrichWithMetadata(message).then(enriched => {
                oldMessages[message.receiver].push(enriched);
                setMessages(oldMessages);
            });
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

        const removeConversation = (account) => {
            if (selectedContactRef.current == account) {
                setSelectedContact('');
            }
        };

        const newMessages = cloneDeep(props.oldMessages);

        const metadataPromises = [];
        for (let message of props.account.messages) {
            if (message.contentType === 'application/sylk-message-metadata') {
                continue; // skip, handled separately
            }

            const senderUri = message.sender.uri;
            const receiver = message.receiver;
            let key = receiver;
            if (message.state === 'received') {
                key = senderUri;
            }
            if (!newMessages[key]) {
                newMessages[key] = [];
            }
            if (!componentJustMounted.current) {
                newMessages[key].push(message);
            } else {
                metadataPromises.push(
                    enrichWithMetadata(message).then(enriched => {
                        newMessages[key].push(enriched);
                    })
                );
            }
        };

        if (!componentJustMounted.current) {
            for (let contact of Object.keys(newMessages)) {
                newMessages[contact].sort((a, b) => a.timestamp - b.timestamp);
            }
            setMessages(newMessages);
        } else {
            Promise.all(metadataPromises).then(() => {
                for (let contact of Object.keys(newMessages)) {
                    newMessages[contact].sort((a, b) => a.timestamp - b.timestamp);
                }
                setMessages(newMessages);
            });
        }
        setShow(true);

        props.account.on('incomingMessage', incomingMessage);
        props.account.on('messageStateChanged', messageStateChanged);
        props.account.on('outgoingMessage', outgoingMessage);
        props.account.on('removeMessage', removeMessage);
        props.account.on('removeConversation', removeConversation);

        componentJustMounted.current = false;
        return () => {
            DEBUG('Running leave hook');
            setShow(false);
            if (props.account !== null) {
                props.account.removeListener('incomingMessage', incomingMessage);
                props.account.removeListener('messageStateChanged', messageStateChanged);
                props.account.removeListener('outgoingMessage', outgoingMessage);
                props.account.removeListener('removeMessage', removeMessage);
                props.account.removeListener('removeConversation', removeConversation);
            }
        }
    }, [props.account, props.oldMessages, isElectron]);


    const loadMessages = (contact, id) => {
        if (contact !== selectedContact) {
            setSelectedContact(contact);
            props.lastContactSelected(contact.defaultUri.uri);
            if (id) {
                DEBUG('Focus message: %s', id);
                setFocus(id);
                setTimeout(() => { setFocus('') }, 750)
            }
            setEditMessage('');
        } else {
            DEBUG('Focus message: %s', id);
            setFocus(id);
            setTimeout(() => { setFocus('') }, 750)
        }
    };

    const loadMoreMessages = () => {
        return props.loadMoreMessages(selectedContact.defaultUri.uri);
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
        setShowInfoPanel(!showInfoPanel);
        setEditContact(false);
        setContactHasError(false);
    }

    const toggleEditContact = () => {
        if (editContact) {
            saveContactRef.current?.save().then(result => {
                setEditContact(result);
            })
        } else {
            setEditContact(!editContact)
        }
    }

    const contactAudioMessages = React.useMemo(() => {
        if (!selectedAudioMessage) return [];
        const contactUri = selectedAudioMessage.state === 'received' ? selectedAudioMessage.sender.uri : selectedAudioMessage.receiver;
        const contact = lookup(contactUri);

        const uniqueUris = [...new Set(contact?.uris?.map(u => u.uri))];
        const allMsgs = uniqueUris.flatMap(uri => messages[uri] || []);
        const filtered = allMsgs.filter(msg => !msg.content.startsWith('?OTRv'));
        filtered.sort((a, b) => a.timestamp - b.timestamp);

        return filtered;
    }, [messages, selectedAudioMessage, lookup])

    const handleFiles = (e) => {
        DEBUG('Selected files %o', e.target.files);
        setUpload({ files: [...e.target.files], uri: selectedContact.defaultUri.uri })
        e.target.value = '';
    }

    const handleMessage = (content, type) => {
        if (editMessage) {
            setFocus(editMessage.id);
            setTimeout(() => { setFocus('') }, 750);

            if (editMessage.contentType === 'application/sylk-file-transfer') {
                const metadata = editMessage.metadata?.find(m => m.action === 'label');
                if (metadata?.value !== content) {
                    fileTransferUtils.sendMetadata(props.account, editMessage.id, selectedContact.defaultUri.uri, content, () => {
                        if (isNodeEmitter(editMessage)) {
                            const oldMessages = cloneDeep(messagesRef.current);
                            const key = editMessage.receiver;
                            const idx = oldMessages[key]?.findIndex(m => m.id === editMessage.id);
                            if (idx !== -1) {
                                const metaIdx = oldMessages[key][idx].metadata?.findIndex(m => m.action === 'label') ?? -1;
                                if (metaIdx !== -1) {
                                    oldMessages[key][idx].metadata[metaIdx].value = content;
                                } else {
                                    oldMessages[key][idx].metadata = [...(oldMessages[key][idx].metadata || []), { action: 'label', value: content }];
                                }
                                setMessages(oldMessages);
                            }
                        }
                    });
                }
                setEditMessage();
                return;
            }
            if (editMessage.content !== content) {
                props.account.sendMessage(selectedContact.defaultUri.uri, content, editMessage.contentType, { timestamp: editMessage.timestamp }, () => {
                    props.removeMessage(editMessage);
                });
            }

            setEditMessage();
            return;
        }

        const isFirstMessage = !messages[selectedContact.uris[0].uri] || messages[selectedContact.uris[0].uri].length === 0;

        if (isFirstMessage) {
            actions.add(selectedContact);
            props.sendPublicKey(selectedContact.defaultUri.uri);
            setNewContacts(prev => prev.filter(c =>
                c.id !== selectedContact.id && c.defaultUri.uri !== selectedContact.defaultUri.uri
                ));
        }

        let message = props.account.sendMessage(selectedContact.defaultUri.uri, content, type);
        setMessages({ ...messages, [selectedContact.defaultUri.uri]: [...contactMessages, message] });
    };

    const handleDownload = (...args) => {
        let { filename } = args[0];
        let notification = notificationCenter().postPreparingFileDownload(filename);

        fileTransferUtils.download(props.account, ...args, notification, notificationCenter).then(() => {
            notificationCenter().removeNotification(notification);
        }).catch(({ error, filename }) => {
            notificationCenter().removeNotification(notification);
            notificationCenter().postFileDownloadFailed(filename, error)
        })
    };

    const handleMessageEdit = (message) => {
        setEditMessage(message);
    }

    const defaultDomain = domain;

    const startChat = () => {
        if (input.current.value !== '') {
            const target = utils.normalizeUri(input.current.value, defaultDomain);
            const contact = { ...lookup(target), _isNew: true };
            const contactsForUri = addressbook.contacts.get(target) ?? [];
            setSelectedContact(contact);
            props.lastContactSelected(target);
            if (contactsForUri.length === 0) {
                setNewContacts(prev =>
                    prev.some(c => c.id === contact.id) ? prev : [contact, ...prev]
                );
                DEBUG('Starting new chat to: %s', target);
                let oldMessages = cloneDeep(messages);
                if (!oldMessages[target]) {
                    oldMessages[target] = [];
                }
                input.current.value = '';
                setFilter('');
                setMessages(oldMessages);
            } else {
                setFilter('');
                input.current.value = '';
                DEBUG('Starting chat to: %O', contact.name);

            }
        }
    };

    const selectAudio = (message) => {
        setSelectedAudioMessage(message);
    }

    const resetSelectedAudio = () => {
        setSelectedAudioMessage(null);
    }

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
        if (timer !== null) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => {
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
                if (calcUnread === uri) {
                    setCalcUnread()
                } else {
                    setCalcUnread(uri)
                }
                props.account.markConversationRead(uri);
                timer = null;
            }
        }, 500);
    };

    const contactMessages = React.useMemo(() => {
        if (!selectedContact) {
            return [];
        }

        const uniqueUris = [...new Set(selectedContact?.uris?.map(u => u.uri))];
        const allMsgs = uniqueUris.flatMap(uri => messages[uri] || []);
        const filtered = allMsgs.filter(msg => !msg.content.startsWith('?OTRv'));

        filtered.sort((a, b) => a.timestamp - b.timestamp);

        return filtered;
    }, [messages, selectedContact]);

    const hasMore = React.useCallback(
        () => {
            if (!selectedContact?.defaultUri?.uri) return false;
            return messageStorage.hasMore(selectedContact.defaultUri.uri);
        },
        [selectedContact]
    );

    const messagePane = (
        <React.Fragment key="pane">
            <MessageList
                loadMoreMessages={loadMoreMessages}
                messages={contactMessages}
                focus={focus}
                key={selectedContact?.defaultUri?.uri || selectedContact}
                hasMore={hasMore}
                displayed={messageDisplayed}
                removeMessage={(message) => props.removeMessage(message)}
                editMessage={(message) => handleMessageEdit(message)}
                isLoadingMessages={props.isLoadingMessages}
                account={props.account}
                uploadFiles={(files) => setUpload({ files: [...files], uri: selectedContact?.defaultUri?.uri })}
                downloadFiles={handleDownload}
                embed={props.embed}
                storageLoadEmpty={props.storageLoadEmpty}
                selectedContact={selectedContact}
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
                editMessage={editMessage}
                cancelEdit={() => { setFocus(''); setEditMessage(''); }}
                multiline
            />
        </React.Fragment>
    );

    const removeChatWrapper = (contact) => {
        if (contact._isNew) {
            setNewContacts(prev => prev.filter(c => c.id !== contact.id));
            setSelectedContact(null);
            return;
        }
        props.removeChat(contact);
    }

    const infoPane = selectedContact && (
        <InfoPanel
            key={selectedContact.id}
            startMessages={contactMessages}
            removeMessage={props.removeMessage}
            account={props.account}
            uploadFiles={(files) => setUpload({ files: [...files], uri: selectedContact?.defaultUri?.uri })}
            downloadFiles={handleDownload}
            selectedContact={selectedContact}
            selectAudio={selectAudio}
            saveContactRef={saveContactRef}
            editContact={editContact}
            setEdit={setEditContact}
            onContactError={setContactHasError}
            notificationCenter={notificationCenter}
            removeChat={removeChatWrapper}
        />
    );

    const onConfirm = () => {
        if (deleteContact._isNew) {
            setNewContacts(prev => prev.filter(c => c.id !== deleteContact.id));
            setDeleteContact(null);
            setSelectedContact(null);
            return;
        }
        props.removeChat(deleteContact);
        setDeleteContact(null);
        if (deleteContact.id === selectedContact?.id) {
            setSelectedContact(null);
        }
        actions.delete(deleteContact).
            then(() => {
                setDeleteContact(null);
            })
            .catch((err) => {
                notificationCenter().postDeleteContactFailed({ error: err });
                setDeleteContact(null);
            })
    };

    const uploadFiles = (files, caption, uri) => {
        setUpload(null);
        fileTransferUtils.upload(props, files, uri, caption);
    };

    return (
        <React.Fragment>
            {!props.embed &&
                <div className="chat">
                    {upload !== null &&
                        <FileUploadModal
                            show={upload !== null}
                            contact={selectedContact}
                            close={() => {
                                setUpload(null);
                            }}
                            upload={upload}
                            onConfirm={uploadFiles}
                        />
                    }
                    {selectedAudioMessage &&
                        <div style={{ top: selectedContact ? '115px' : '66px' }} className={classes.audioToolbar}>
                            <ToolbarAudioPlayer
                                account={props.account}
                                messages={contactAudioMessages}
                                message={selectedAudioMessage}
                                close={resetSelectedAudio}
                            />
                        </div>
                    }
                    <ConferenceDrawer
                        show={show && !showInfoPanel && (!matches || selectedContact !== '')}
                        size="full"
                        anchor="right"
                        close={() => setShow(false)}
                        position="full"
                        noBackgroundColor
                        showClose={false}
                        slideProps={{ direction: 'right', unmountOnExit: false }}
                    >

                        {selectedContact &&
                            <Toolbar className={classes.toolbar} style={{ marginLeft: '-15px', marginTop: '-15px', marginRight: '-15px', paddingLeft: '10px', paddingRight: '10px' }}>
                                {matches &&
                                    <button type="button" className="close" onClick={() => setSelectedContact('')}>
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
                                            <UserIcon identity={selectedContact.identity} active={false} small={true} />
                                        </div>
                                        <div onClick={togglePanel} style={{ flex: '1', display: 'flex', alignItems: 'center' }}>
                                            <Typography className={classes.title} variant="h6" noWrap>
                                                {selectedContact.name}
                                                {selectedContact.name && selectedContact.name !== selectedContact.defaultUri.uri && <span className={classes.toolbarName}>&mdash; {selectedContact.defaultUri.uri}</span>}
                                            </Typography>
                                        </div>
                                        {props.hideCallButtons === false && [
                                            <IconButton key="callButton" className="fa fa-phone" disabled={props.noConnection} onClick={() => props.startCall(selectedContact.defaultUri.uri, { video: false })} />,
                                            <IconButton key="videoCallButton" className="fa fa-video-camera" disabled={props.noConnection} onClick={() => props.startCall(selectedContact.defaultUri.uri)} />
                                        ]}
                                    </React.Fragment>
                                }
                                <Divider absolute />
                            </Toolbar>
                        }
                        {selectedAudioMessage && <div className={classes.spacer35} />}
                        {selectedContact
                            ?
                            <React.Fragment>
                                {
                                    props.account?.pgp === null &&
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
                        show={show && showInfoPanel && (!matches || selectedContact !== '')}
                        size="full"
                        anchor="right"
                        close={() => setShow(false)}
                        position="full"
                        showClose={false}
                    >
                        {selectedContact &&
                            <Toolbar className={classes.toolbar} style={{ backgroundColor: '#fff', marginLeft: '-15px', marginTop: '-15px', marginRight: '-15px', paddingLeft: '10px', paddingRight: '10px' }}>
                                {props.isLoadingMessages === true
                                    ?
                                    <React.Fragment>
                                        <CircularProgress style={{ color: '#888', margin: '5px', marginRight: '10px', width: '35px', height: '35px', display: 'block' }} />
                                        <Typography className={classes.title} variant="h6" noWrap>Updating</Typography>
                                    </React.Fragment>
                                    :
                                    <React.Fragment>
                                        <Grid container alignItems="center">
                                            <Grid item xs={4} style={{ display: 'flex', alignItems: 'center' }}>
                                                <button type="button" className="close" style={{ float: 'left', marginRight: '4px' }} onClick={togglePanel}>
                                                    <span aria-hidden="true"><i className={chevronIcon} /></span>
                                                    <span className="sr-only">Back</span>
                                                </button>
                                                <Typography onClick={togglePanel} className={classes.title} component="span" noWrap>Back</Typography>
                                            </Grid>
                                            <Grid item xs={4} style={{ display: 'flex', justifyContent: 'center' }}>
                                                <Typography className={classes.centerTitle} variant="h6" noWrap>
                                                    Info
                                                </Typography>
                                            </Grid>
                                            <Grid item xs={4} style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                                <button className={clsx('btn', 'btn-link', classes.infoToolbarButton)} disabled={contactHasError} onClick={toggleEditContact}>{editContact ? 'Done' : 'Edit'}</button>
                                            </Grid>
                                        </Grid>
                                    </React.Fragment>
                                }
                                <Divider absolute />
                            </Toolbar>
                        }
                        {selectedAudioMessage && <div className={classes.spacer50} />}
                        <div style={{ overflowY: 'auto', overflowX: 'hidden', height: '100%', margin: '-15px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                                <div className={classes.spacer15} />
                                {selectedContact
                                    ?
                                    <React.Fragment>
                                        {
                                            props.account?.pgp === null &&
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
                            </div>
                        </div>
                    </ConferenceDrawer>
                    <ConferenceDrawer
                        show={show && (selectedContact === '' && matches) || !matches}
                        anchor="left"
                        showClose={false}
                        close={() => { }}
                        size="normalWide"
                        noBackgroundColor
                    >
                        {selectedAudioMessage !== '' && matches && <div className={classes.spacer50} />}
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
                            selectedContact={selectedContact}
                            filter={filter}
                            defaultDomain={defaultDomain}
                            removeChat={(contact) => {
                                props.removeChat(contact);
                                setSelectedContact('');
                            }}
                            deleteContact={setDeleteContact}
                            calcUnread={calcUnread}
                            downloadFiles={handleDownload}
                            uploadFiles={(files, uri) => setUpload({ files: [...files], uri: uri })}
                            selectAudio={selectAudio}
                            editContact={(contact) => {
                                setSelectedContact(contact);
                                setShowInfoPanel(true);
                                setEditContact(true);
                            }}
                            newContacts={newContacts}
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

            <ContactDeleteModal
                show={deleteContact !== null}
                close={() => { setDeleteContact(null); }}
                contact={deleteContact}
                onConfirm={onConfirm}
            />
            {showVoiceMessageRecordModal &&
                <VoiceMessageRecorderModal
                    show={showVoiceMessageRecordModal}
                    close={toggleRecordVoiceMessage}
                    contact={selectedContact}
                    anchorElement={anchorEl.current}
                    sendAudioMessage={(...args) => fileTransferUtils.upload(props, ...args, selectedContact)}
                />
            }
        </React.Fragment>
    );
}

Chat.propTypes = {
    account: PropTypes.object.isRequired,
    focusOn: PropTypes.string.isRequired,
    loadMoreMessages: PropTypes.func.isRequired,
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
    notificationCenter: PropTypes.func.isRequired,
    storageLoadEmpty: PropTypes.bool,
    noConnection: PropTypes.bool
};


module.exports = Chat;
