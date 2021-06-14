'use strict';

const React         = require('react');
const {useEffect, useState, useRef} = React;
const debug         = require('debug');
const PropTypes      = require('prop-types');
const { makeStyles } = require('@material-ui/core/styles');
const { Toolbar, Divider, Typography } = require('@material-ui/core');
const { IconButton, useMediaQuery } = require('@material-ui/core');

const { default: clsx }     = require('clsx');
const ConferenceDrawer = require('./ConferenceDrawer');
const ContactList = require('./Chat/ContactList');
const UserIcon = require('./UserIcon');
const MessageList = require('./Chat/MessageList');
const ConferenceChatEditor = require('./ConferenceChatEditor');

const utils           = require('../utils');
const DEBUG = debug('blinkrtc:Chat');


const dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

const parseDates = (key, value) => {
    if (typeof value === 'string' && dateFormat.test(value)) {
        return new Date(value);
    }
    return value;
}

const copyObject = (object) => {
    return JSON.parse(JSON.stringify(object), parseDates)
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
    }
}));

const Chat = (props) => {
    const classes = styleSheet(props);
    const [messages, _setMessages] = useState({});
    const [filter, setFilter] = useState('');

    const [show, setShow]   = useState(false);
    const [focus, setFocus] = useState('');
    const [selectedUri, _setSelectedUri] = useState('');

    const selectedUriRef = useRef(selectedUri);
    const messagesRef    = useRef(messages);
    const contactCache   = useRef(props.contactCache);
    const input          = useRef();

    let propagateFocus = false;

    const setSelectedUri = uri => {
        selectedUriRef.current = uri
        _setSelectedUri(uri);
    }

    const setMessages = data => {
        messagesRef.current = data
        _setMessages(data);
    }

    const componentJustMounted = useRef(true);

    useEffect(() => {
        setSelectedUri(props.focusOn)
    }, [props.focusOn]);

    useEffect(() => {
        DEBUG('Loading messages');
        const incomingMessage = (message) => {
            DEBUG('Incoming Message from: %s', message.sender.uri);
            let oldMessages = Object.assign({}, messagesRef.current);
            if (!oldMessages[message.sender.uri]) {
                oldMessages[message.sender.uri] = [];
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

        const newMessages = Object.assign({}, copyObject(props.oldMessages));
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

        setMessages(newMessages);
        setShow(true);

        props.account.on('message', incomingMessage);
        props.account.on('messageStateChanged', messageStateChanged);

        componentJustMounted.current = false;
        return () => {
            DEBUG('Running leave hook');
            setShow(false);
            props.account.removeListener('message', incomingMessage);
            props.account.removeListener('messageStateChanged', messageStateChanged);
        }
    }, [props.account, props.oldMessages]);


    const loadMessages = (uri, id) => {
        // Remove entries with 0 messages from contact list
        if (selectedUri) {
            if (messages[selectedUri].length === 0) {
                const oldMessages = Object.assign({}, messages);
                delete oldMessages[selectedUri];
                setMessages(oldMessages);
            }
        }

        if (uri !== selectedUri) {
            setSelectedUri(uri);
            if (id) {
                DEBUG('Focus message: %s', id);
                setFocus(id);
                setTimeout(() =>{ setFocus('')}, 750)
            }
        } else {
            DEBUG('Focus message: %s', id);
            setFocus(id);
            setTimeout(() =>{ setFocus('')}, 750)
        }
    };

    const loadMoreMessages = () => {
        props.loadMoreMessages(selectedUri);
    };

    const toggleChatEditorFocus = () => {
        props.propagateKeyPress(propagateFocus);
        propagateFocus = !propagateFocus;
    };

    const filterMessages = () => {
        setFilter(input.current.value);
    }

    const contactMessages = messages[selectedUri] ? [...messages[selectedUri]] : [];

    const handleMessage = (content, type) => {
        let message = props.account.sendMessage(selectedUri, content, type)
        const oldMessages = Object.assign({}, messages);
        if (!oldMessages[selectedUri]) {
             oldMessages[selectedUri] = [];
        }
        oldMessages[selectedUri].push(message);
        setMessages(oldMessages);
    };

    const defaultDomain = props.account.id.substring(props.account.id.indexOf('@') + 1);

    const startChat = () => {
        if (input.current.value !== '') {
            const target = utils.normalizeUri(input.current.value, defaultDomain);
            setSelectedUri(target);
            DEBUG('Starting new chat to: %s', target);
            let oldMessages = Object.assign({}, messages);
            if (!oldMessages[target]) {
                oldMessages[target] = [];
            }
            input.current.value = '';
            setFilter('');
            setMessages(oldMessages);
        }
    };

    const getDisplayName = (uri) => {
        if (props.contactCache.has(uri)) {
            return {uri: uri, displayName: props.contactCache.get(uri)};
        }
        return {uri: uri};
    };

    const matches = useMediaQuery('(max-width:959.95px)');

    const chevronIcon = clsx({
        'fa'                : true,
        'fa-chevron-left'   : true
    });

    return (
        <div className="chat">
            <ConferenceDrawer
                show = {show && (!matches || selectedUri !== '')}
                size = "full"
                anchor = "right"
                close = {() => {setSelectedUri()}}
                position = "full"
                noBackgroundColor
                showClose = {false}
            >
            { selectedUri !== ''
                ? <React.Fragment>
                    <Toolbar className={classes.toolbar} style={{marginLeft:'-15px', marginTop: '-15px', marginRight: '-15px'}}>
                        { matches &&
                            <button type="button" className="close" onClick={() => setSelectedUri('')}>
                                <span aria-hidden="true"><i className={chevronIcon} /></span>
                                <span className="sr-only">Close</span>
                            </button>
                        }
                        <UserIcon identity={getDisplayName(selectedUri)} active={false} small={true}/>
                        <Typography className={classes.title} variant="h6" noWrap>
                            {getDisplayName(selectedUri).displayName || selectedUri}
                        </Typography>
                        <IconButton className="fa fa-phone" onClick={()=> props.startCall(selectedUri, {video: false})} />
                        <IconButton className="fa fa-video-camera" onClick={()=>props.startCall(selectedUri)} />
                        <Divider absolute />
                    </Toolbar>
                    <MessageList
                        loadMoreMessages = {loadMoreMessages}
                        messages = {contactMessages}
                        focus = {focus}
                        key = {selectedUri}
                        hasMore = {() => props.messageStorage.hasMore(selectedUri)}
                        contactCache = {contactCache.current}
                        displayed = {(uri, id, timestamp, state) => {
                            props.account.sendDispositionNotification(
                                uri,
                                id,
                                timestamp,
                                state
                            )}}
                    />
                    <ConferenceChatEditor
                        onSubmit = {handleMessage}
                        onTyping = {()=>{}}
                        scroll = {()=>{}}
                        focus = {toggleChatEditorFocus}
                        setFocus = {true}
                        multiline
                    />
                  </React.Fragment>
                : <div style={{justifyContent: 'center', alignItems:'center', display: 'flex', flexDirection: 'column', height: '100%'}}>
                        <div className="chat-image" />
                        <h1 className="cover-heading">No chat selected</h1>
                  </div>
            }
            </ConferenceDrawer>
            <ConferenceDrawer
                show = {show && (selectedUri === '' && matches) || !matches}
                anchor = "left"
                showClose = {false}
                close = {() => {}}
                size = "normalWide"
                noBackgroundColor
            >
                <Toolbar className={classes.toolbar} style={{margin: '-15px -15px 0'}}>
                    <input
                        type = "text"
                        id = "uri-input"
                        name = "uri-input"
                        className = "form-control"
                        placeholder = "Search or start new chat"
                        ref = {input}
                        onChange = {filterMessages}
                    />
                    <Divider absolute />
                </Toolbar>
                <ContactList
                    messages = {messages}
                    loadMessages = {loadMessages}
                    startChat = {startChat}
                    selectedUri = {selectedUri}
                    contactCache = {contactCache.current}
                    filter = {filter}
                    defaultDomain = {defaultDomain}
                    removeChat = {(contact) => {
                        props.removeChat(contact);
                        setSelectedUri('');
                    }}
                />
            </ConferenceDrawer>
        </div>
    );
}

Chat.propTypes = {
    account             : PropTypes.object.isRequired,
    contactCache        : PropTypes.object.isRequired,
    focusOn             : PropTypes.string.isRequired,
    loadMoreMessages    : PropTypes.func.isRequired,
    messageStorage      : PropTypes.object.isRequired,
    oldMessages         : PropTypes.object.isRequired,
    propagateKeyPress   : PropTypes.func.isRequired,
    removeChat          : PropTypes.func.isRequired,
    startCall           : PropTypes.func.isRequired
};


module.exports = Chat;
