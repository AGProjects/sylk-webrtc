'use strict';

const React         = require('react');
const useEffect     = React.useEffect;
const useRef        = React.useRef;
const useState      = React.useState;
const debug         = require('debug');
const PropTypes     = require('prop-types');

const { DateTime }                        = require('luxon');
const { CircularProgress } = require('@material-ui/core');
const { default: VizSensor }              = require('react-visibility-sensor');

const Message = require('./Message');
const DividerWithText = require('../DividerWithText');

const DEBUG = debug('blinkrtc:MessageList');


const formatTime = (message) => {
    const date = DateTime.fromJSDate(message.timestamp);
    const diff = date.diff(DateTime.local().startOf('day'), 'days').as('days');
    const yearDiff = date.diff(DateTime.local().startOf('year'), 'year').as('year');

    if (yearDiff >= 1) {
        return date.toFormat('dd/LL/yyyy');
    }
    if (diff < -6) {
        return date.toFormat('dd/LL');
    }
    if (diff < -1) {
        return date.toFormat('EEEE');
    }
    if (diff < 0) {
        return 'Yesterday';
    }
    if (diff < 1) {
        return 'Today';
    }
    return date.toFormat('dd/LL');
};

const MessageList = ({
    messages,
    focus,
    hasMore,
    displayed,
    loadMoreMessages,
    contactCache
}) => {
    const [entries, setEntries] = useState([])
    const [display, setDisplay] = useState(false);
    const [loading, setLoading] = useState(false);
    const [more, setMore]    = useState(false);

    const messagesRef = useRef(null);
    const messagesEndRef = useRef(null);
    const messagesBefore = useRef(null);
    const prevMessages = useRef([])

    const scrollToBottom = React.useCallback(() => {
        if (loading) {
            const scrollPosition =  messagesRef.current.scrollHeight - messagesBefore.current[0];
            messagesRef.current.scrollTop = scrollPosition;
            return;
        }
        if (focus) return;

        if (display !== true && messagesEndRef.current !== null) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        } else {
            messagesEndRef.current.scrollIntoView({behavior: 'smooth'})
        }
    }, [focus, loading, display]);

    useEffect(scrollToBottom, [scroll]);

    useEffect(() => {
        if (JSON.stringify(prevMessages.current) === JSON.stringify(messages) && !focus) {
            return;
        }
        DEBUG('Entries changed or focus, updating entries');
        let prevMessage = null;
        let timestamp = null;

        prevMessages.current = messages;
        const entries = messages.filter((message) => {
            return !message.content.startsWith('?OTRv')
        }).map((message) => {
            let continues = false;
            if (prevMessage !== null  && prevMessage.sender.uri == message.sender.uri) {
                continues = true;
            }
            if (prevMessage === null || formatTime(prevMessage) !== formatTime(message)) {
                timestamp = (<div style={{padding: '5px 15px 0 15px'}}><DividerWithText>{formatTime(message)}</DividerWithText></div>);
                continues = false;
            } else {
                timestamp = null;
            }
            prevMessage = message;
            return (
                <React.Fragment key={message.id}>
                    {timestamp}
                    <Message
                        displayed = {() => {
                            if (message.state == 'received'
                                && message.dispositionState !== 'displayed'
                                && message.dispositionNotification.indexOf('display') !== -1
                            ) {
                                displayed(message.sender.uri, message.id, message.timestamp, 'displayed')
                            }
                        }}
                        focus = {focus === message.id}
                        message = {message}
                        cont = {continues}
                        scroll = {scrollToBottom}
                        contactCache = {contactCache}
                    />
                </React.Fragment>
            )
        });
        setEntries(entries);
    }, [messages, focus, displayed, scrollToBottom, contactCache]);

    useEffect(() => {
        const canLoadMore = () => {
            if (hasMore) {
                hasMore().then((value) => {
                    setMore(value);
                });
            }
        };

        if (entries.length !== 0 && display !== true) {
            canLoadMore();
            setTimeout(() => {
               setDisplay(true);
            }, 150);
        }
        if (entries.length !== 0 && loading === true) {
            canLoadMore();
            setLoading(false);
        }
    }, [entries, display, loading, hasMore])


    const loadMore = () => {
        DEBUG('Attempting to load more messages');
        setLoading(true);
        messagesBefore.current = [messagesRef.current.scrollHeight, messagesRef.current.scrollTop];
        setTimeout(() => {
           loadMoreMessages();
        }, 150);
    };

    return (
        <div
            className = "drawer-chat"
            ref = {messagesRef}
            style = {display ? {visibility:'visible'} : {visibility: 'hidden'}}
        >
        { more === true &&
            <VizSensor delayedCall={true} onChange={(isVisible) => {
                DEBUG('Top is now %s', isVisible ? 'visible' : 'hidden');
                if (isVisible) {
                    loadMore();
                }}}
            >
                <CircularProgress style={{ color: '#888', margin: 'auto', display: 'block' }} />
            </VizSensor>
        }
            {entries}
            <div ref={messagesEndRef} />
        </div>
    );
};

MessageList.propTypes = {
    scroll: PropTypes.bool,
    messages: PropTypes.array.isRequired,
    focus: PropTypes.string,
    loadMoreMessages: PropTypes.func.isRequired,
    hasMore: PropTypes.func.isRequired,
    displayed: PropTypes.func.isRequired,
    contactCache: PropTypes.object
};


module.exports = MessageList;
