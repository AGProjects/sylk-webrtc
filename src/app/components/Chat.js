'use strict';

const React = require('react');
const { useEffect, useState, useRef } = React;
const debug = require('debug');
const PropTypes = require('prop-types');
const { locationSharing: sylkLocationSharing } = require('sylkrtc');
const { cloneDeep, isEqual } = require('lodash');
const { makeStyles } = require('@material-ui/core/styles');
const { CircularProgress, Toolbar, Divider, Typography, Grid } = require('@material-ui/core');
const { IconButton, useMediaQuery } = require('@material-ui/core');
const { v4: uuidv4 } = require('uuid');

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
const { applyLocationEvent } = require('../locationTrail');
const locationSharing = require('../locationSharing');

const { useAddressbook } = require('../AddressbookProvider');
const { useConfig } = require('../ConfigProvider')


const DEBUG = debug('blinkrtc:Chat');

const { isNodeEmitter } = require('../utils');

const endedLocationSessions = new Set();

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
    },
    item: {
        fontSize: '14px',
        fontFamily: 'inherit',
        color: '#333',
        minHeight: 0
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
    const [addressbookLoaded, setAddressbookLoaded] = useState(false);

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
    const timerRef = useRef(null);

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
        if (!addressbookLoaded) setAddressbookLoaded(true);
        setNewContacts(prev => {
            const pruned = prev.filter(c => {
                const uri = c.defaultUri?.uri;
                return !(uri && addressbook.contacts.get(uri)?.length > 0);
            });
            if (pruned.length !== prev.length) {
                DEBUG('Pruned %d stale draft contact(s)', prev.length - pruned.length);
            }
            return pruned;
        });

        if (selectedContactRef.current) {
            const currentId = selectedContactRef.current.id;
            const currentUri = selectedContactRef.current.defaultUri?.uri;

            const updated = [...addressbook.contacts.values()]
            .flat()
            .find(c => c.id === currentId || (currentUri && c.defaultUri?.uri === currentUri));

            if (updated && !isEqual(updated, selectedContactRef.current)) {
                DEBUG('selectedContact updated: %o', updated);
                _setSelectedContact(updated);
                selectedContactRef.current = updated;
            }
        }

        if (!props.focusOn || props.focusOn === '') return;
        if (!addressbookLoaded) return;

        const contact = lookup(props.focusOn);
        if (selectedContactRef.current !== contact) {
            DEBUG('Setting selectedContact from lookup: %s -> %o', props.focusOn, contact);
            setSelectedContact(contact);
        }
        const inAddressbook = addressbook.contacts.get(contact.defaultUri.uri)?.length > 0;
        if (!inAddressbook) {
            setNewContacts(prev =>
                prev.some(c => c.id === contact.id) ? prev : [{ ...contact, _isNew: true }, ...prev]
            );
        }
    }, [addressbook.contacts, props.focusOn, lookup, addressbookLoaded]);

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

        const _bubbleToState = (bubble) => ({
            trail: Array.isArray(bubble.locationTrail) ? bubble.locationTrail.slice() : [],
            peerTrail: Array.isArray(bubble.locationPeerTrail) ? bubble.locationPeerTrail.slice() : [],
            startTrail: Array.isArray(bubble.locationStartTrail) ? bubble.locationStartTrail.slice() : [],
            peerStartTrail: Array.isArray(bubble.locationPeerStartTrail) ? bubble.locationPeerStartTrail.slice() : [],
            destination: bubble.locationDestination || null,
            expires: bubble.locationExpires || null,
            ended: Boolean(bubble.locationEnded),
            endReason: bubble.locationEndReason || null,
            oneShot: Boolean(bubble.locationOneShot),
            role: bubble.locationRole || null
        });

        const _writeBubbleState = (bubble, state) => ({
            ...bubble,
            locationTrail: state.trail,
            locationPeerTrail: state.peerTrail,
            locationStartTrail: state.startTrail,
            locationPeerStartTrail: state.peerStartTrail,
            locationDestination: state.destination,
            locationExpires: state.expires,
            locationEnded: state.ended,
            locationEndReason: state.endReason,
            locationOneShot: state.oneShot,
            locationRole: state.role
        });

        const foldLocationEvent = (messages, event, contact, msgId, msgTs) => {
            const originId = event && event.sessionId;
            if (!originId || !contact) return;
            const json = event.json;

            const teardown = event.kind === 'stop' || event.kind === 'end' || event.kind === 'reject';
            if (teardown) endedLocationSessions.add(originId);
            if (event.kind === 'request' || event.kind === 'accept') {
                if (event.kind === 'request' && event.direction === 'incoming') {
                    DEBUG('[location] ignoring incoming location_request from %s (viewer never shares)', contact);
                }
                return;
            }
            if (event.kind === 'coords' && endedLocationSessions.has(originId)) return;

            let foundKey = null;
            let foundIdx = -1;
            for (const [key, msgs] of Object.entries(messages)) {
                const idx = msgs.findIndex(m => m.id === originId && m.contentType === 'application/sylk-location-sharing');
                if (idx !== -1) { foundKey = key; foundIdx = idx; break; }
            }

            if (foundKey !== null) {
                const arr = messages[foundKey].slice();
                const prev = arr[foundIdx];
                const prevState = _bubbleToState(prev);
                const state = applyLocationEvent(prevState, json);
                const _mine = (typeof prev.mine === 'boolean') ? prev.mine : (event.direction === 'outgoing');
                arr[foundIdx] = Object.assign(_writeBubbleState(prev, state), { mine: _mine });
                messages[foundKey] = arr;
                DEBUG('[location] fold UPDATE session %s msg=%s kind=%s dir=%s trail=%s peerTrail=%s',
                    String(originId).slice(0, 8), msgId || '-', event.kind, event.direction, state.trail.length, state.peerTrail.length);
                return;
            }

            if (teardown) {
                DEBUG('[location] fold TEARDOWN no bubble for session %s msg=%s kind=%s dir=%s',
                    String(originId).slice(0, 8), msgId || '-', event.kind, event.direction);
                return;
            }

            const state = applyLocationEvent(null, json);
            const list = messages[contact] ? messages[contact].slice() : [];
            const createdAt = msgTs ? new Date(msgTs)
                : (json.timestamp ? new Date(json.timestamp)
                    : (state.trail.length ? state.trail[state.trail.length - 1].timestamp : new Date()));
            list.push(_writeBubbleState({
                id: originId,
                contentType: 'application/sylk-location-sharing',
                content: '',
                timestamp: createdAt,
                mine: event.direction === 'outgoing',
                state: event.direction === 'outgoing' ? 'sent' : 'received',
                dispositionState: 'displayed',
                dispositionNotification: [],
                sender: {
                    uri: event.uri || contact,
                    displayName: null
                },
                receiver: contact,
                metadata: [],
                type: 'normal'
            }, state));
            list.sort((a, b) => a.timestamp - b.timestamp);
            messages[contact] = list;
            DEBUG('[location] fold CREATE session %s msg=%s kind=%s dir=%s trail=%s',
                String(originId).slice(0, 8), msgId || '-', event.kind, event.direction, state.trail.length);
        };

        const handleLocationEvent = (event, contact, msgId, msgTs) => {
            const oldMessages = Object.assign({}, messagesRef.current);
            foldLocationEvent(oldMessages, event, contact, msgId, msgTs);
            setMessages(oldMessages);
        };

        const deriveLocationEvent = (message, contact, direction) => {
            if (message.jsonError || !message.json) {
                // no envelope on either side - grep target for rollover issues
                DEBUG('[location] derive: no envelope (%s) msg=%s metadata=%s', direction,
                    message.id || '-', message.wireMetadata ? 'present' : 'absent');
                return null;
            }
            return locationSharing.toLocationEvent(message.json, {
                senderUri: contact,
                messageId: message.id,
                messageTimestamp: message.timestamp,
                direction
            });
        };

        const ingestLocationSharing = (message, contact, direction) => {
            const _contact = (contact && typeof contact === 'object' && contact.uri) ? contact.uri : contact;
            const event = deriveLocationEvent(message, _contact, direction);
            const _sid = (event && event.sessionId) || message.json?.sessionId || message.json?.messageId || message.id;
            DEBUG('[location] ingest %s contact=%s action=%s session=%s msg=%s event=%s',
                direction, _contact, message.json?.action,
                _sid ? String(_sid).slice(0, 8) : '-',
                message.id || '-',
                !!event);
            if (event) handleLocationEvent(event, _contact, message.id, message.timestamp);
        };

        const replayLocationHistory = (accountMessages, target) => {
            const shareMessages = accountMessages
            .filter(m => sylkLocationSharing.isLocationSharing(m.contentType))
            .slice()
            .sort((a, b) => a.timestamp - b.timestamp);

            for (const message of shareMessages) {
                const direction = message.state === 'received' ? 'incoming' : 'outgoing';
                const contact = direction === 'incoming'
                    ? (message.sender && message.sender.uri)
                    : message.receiver;
                if (!contact) continue;
                const event = deriveLocationEvent(message, contact, direction);
                if (event) foldLocationEvent(target, event, contact, message.id, message.timestamp);
            }
        };

        const incomingMessage = (message) => {
            DEBUG('Incoming Message from: %s', message.sender.uri);
            if (message.contentType === 'text/pgp-public-key-imported') {
                return;
            }

            if (sylkLocationSharing.isLocationSharing(message.contentType)) {
                ingestLocationSharing(message, message.sender.uri, 'incoming');
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

        const messageStateChanged = (messageId, state, data) => {
            const _reason = data && data.reason;
            const _code = data && data.code;
            DEBUG('Message state changed: id=%s state=%s%s', messageId, state,
                (_reason || _code) ? ` reason=${_reason ?? '-'} code=${_code ?? '-'}` : '');
            let oldMessages = Object.assign({}, messagesRef.current);
            setMessages(oldMessages);
        };

        const outgoingMessage = (message) => {
            if (sylkLocationSharing.isLocationSharing(message.contentType)) {
                ingestLocationSharing(message, message.receiver, 'outgoing');
                return;
            }
            if (message.contentType === 'application/sylk-message-metadata') {
                if (message.jsonError || !message.json || !message.json.messageId) return;
                return;
            }
            if (message.contentType === 'text/pgp-private-key') {
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
            if (message.contentType === 'application/sylk-message-metadata'
                || sylkLocationSharing.isLocationSharing(message.contentType)) {
                continue;
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

        replayLocationHistory(props.account.messages, newMessages);

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
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
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
        const filtered = allMsgs.filter(msg => !msg.content.startsWith('?OTRv') && msg.contentType !== 'application/sylk-location-sharing');
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
            if (!addressbookLoaded) {
                DEBUG('startChat: addressbook not loaded yet, ignoring: %s', input.current.value);
                return;
            }
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
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
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

    const stopLocationShare = React.useCallback((message) => {
        if (!message || !message.id || !props.account) return;
        const sessionId = message.id;
        const peerUri = (message.receiver && typeof message.receiver === 'object'
            ? message.receiver.uri : message.receiver)
            || selectedContactRef.current?.defaultUri?.uri;
        if (!peerUri) { DEBUG('[location] stopLocationShare: no peer uri for %s', sessionId); return; }
        // stop is coordinate-free; sessionId is the only required field
        const wire = {
            action: 'location_stop',
            reason: 'ended',
            sessionId: sessionId
        };
        try {
            props.account.sendMessage(
                peerUri, JSON.stringify(wire), 'application/sylk-location-sharing',
                {}, (error) => {
                    if (error) DEBUG('[location] stopLocationShare send error: %s', error);
                });
            DEBUG('[location] stopLocationShare sent session %s to %s', String(sessionId).slice(0, 8), peerUri);
        } catch (e) {
            DEBUG('[location] stopLocationShare threw: %s', e && e.message);
        }
        endedLocationSessions.add(sessionId);
        const oldMessages = Object.assign({}, messagesRef.current);
        for (const [key, msgs] of Object.entries(oldMessages)) {
            if (!Array.isArray(msgs)) continue;
            const idx = msgs.findIndex(m => m.id === sessionId && m.contentType === 'application/sylk-location-sharing');
            if (idx !== -1) {
                const arr = msgs.slice();
                arr[idx] = Object.assign({}, arr[idx], { locationEnded: true, locationEndReason: 'ended' });
                oldMessages[key] = arr;
                setMessages(oldMessages);
                break;
            }
        }
    }, [props.account]);

    const requestLocation = () => {
        const uri = selectedContact?.defaultUri?.uri;
        if (!uri || !props.account) return;
        const requestId = uuidv4();
        // Coordinate-free as well: empty content, envelope in the metadata.
        const wire = {
            action: 'location_request',
            messageId: requestId,
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        };
        try {
            props.account.sendMessage(
                uri, JSON.stringify(wire), 'application/sylk-location-sharing',
                { id: requestId }, (error) => {
                    if (error) DEBUG('[location] requestLocation send error: %s', error);
                });
            DEBUG('[location] requestLocation sent to %s req=%s', uri, requestId);
        } catch (e) {
            DEBUG('[location] requestLocation threw: %s', e && e.message);
        }
    };

    const shareLocationOnce = async () => {
        const uri = selectedContact?.defaultUri?.uri;
        if (!uri || !props.account || !props.account.pgp) return;
        try {
            const coords = await locationSharing.getCurrentPosition();
            const envelopeId = uuidv4();
            const envelope = JSON.stringify({ action: 'location_once', value: JSON.stringify(coords) });
            const sentMessage = props.account.sendMessage(
                uri, envelope, 'application/sylk-location-sharing',
                { id: envelopeId },
                (error) => { if (error) DEBUG('[location] shareLocationOnce send error: %s', error); }
            );

            const bubble = {
                id: envelopeId,
                contentType: 'application/sylk-location-sharing',
                content: '',
                timestamp: sentMessage.timestamp,
                mine: true,
                state: 'sent',
                dispositionState: 'displayed',
                dispositionNotification: [],
                sender: { uri: props.account.id, displayName: null },
                receiver: uri,
                metadata: [],
                chunkIds: [],
                type: 'normal',
                locationTrail: [coords],
                locationPeerTrail: [],
                locationStartTrail: [],
                locationPeerStartTrail: [],
                locationDestination: null,
                locationExpires: null,
                locationEnded: false,
                locationEndReason: null,
                locationOneShot: true,
                locationRole: null
            };

            const oldMessages = Object.assign({}, messagesRef.current);
            const list = oldMessages[uri] ? oldMessages[uri].slice() : [];
            list.push(bubble);
            list.sort((a, b) => a.timestamp - b.timestamp);
            oldMessages[uri] = list;
            setMessages(oldMessages);
        } catch (e) {
            DEBUG('[location] shareLocationOnce failed: %s', e.message);
        }
    };
    const isElectronLinux = isElectron && navigator.userAgent.toLowerCase().includes('linux');
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
                stopLocationShare={stopLocationShare}
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
                requestLocation={props.noConnection ? null : requestLocation}
                shareLocationOnce={isElectronLinux || props.noConnection ? null : shareLocationOnce}
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
                    sendAudioMessage={(...args) => fileTransferUtils.upload(props, ...args, selectedContact.defaultUri.uri)}
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
