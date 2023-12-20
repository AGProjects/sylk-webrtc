'use strict';

const React = require('react');
const useEffect = React.useEffect;
const useRef = React.useRef;
const useState = React.useState;
const debug = require('debug');
const PropTypes = require('prop-types');

const { DateTime } = require('luxon');
const { CircularProgress } = require('@material-ui/core');
const { useInView } = require('react-intersection-observer');
const { default: TransitionGroup } = require('react-transition-group/TransitionGroup');
const { default: CSSTransition } = require('react-transition-group/CSSTransition');

const DividerWithText = require('../DividerWithText');
const DragAndDrop = require('../DragAndDrop');
const FileTransferMessage = require('./FileTransferMessage');
const ImagePreviewModal = require('./ImagePreviewModal')
const Message = require('./Message');

const { useHasChanged } = require('../../hooks');
const fileTransferUtils = require('../../fileTransferUtils');

const DEBUG = debug('blinkrtc:MessageList');


const formatTime = (message) => {
    const date = DateTime.fromJSDate(message.timestamp);
    const diff = date.diff(DateTime.local().startOf('day'), 'days').as('days');
    const yearDiff = date.diff(DateTime.local().startOf('year'), 'year').as('year');

    if (yearDiff <= 0) {
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
    contactCache,
    removeMessage,
    account,
    uploadFiles,
    downloadFiles,
    embed,
    storageLoadEmpty
}) => {
    const [entries, setEntries] = useState([])
    const [display, setDisplay] = useState(false);
    const [loading, setLoading] = useState(false);
    const [more, setMore] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [image, setImage] = useState('');
    const [message, setMessage] = useState({});

    const messagesRef = useRef(null);
    const messagesEndRef = useRef(null);
    const messagesBefore = useRef(null);
    const prevMessagesChanged = useHasChanged(messages);

    const { ref, inView, entry } = useInView({
        threshold: 0
    });

    const scrollToBottom = React.useCallback(() => {
        if (loading) {
            const scrollPosition = messagesRef.current.scrollHeight - messagesBefore.current[0];
            messagesRef.current.scrollTop = scrollPosition;
            return;
        }
        if (focus) return;

        if (display !== true && messagesEndRef.current !== null) {
            messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
        } else {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [focus, loading, display]);

    const loadMore = React.useCallback(() => {
        DEBUG('Attempting to load more messages');
        setLoading(true);
        messagesBefore.current = [messagesRef.current.scrollHeight, messagesRef.current.scrollTop];
        setTimeout(() => {
            loadMoreMessages();
        }, 150);
    }, [loadMoreMessages]);

    useEffect(scrollToBottom, [scroll]);

    useEffect(() => {
        if (!prevMessagesChanged && !focus) {
            return;
        }
        DEBUG('Entries changed or focus, updating entries');

        let ignore = false;
        let prevMessage = null;
        let timestamp = null;

        const getImage = (message) => {
            fileTransferUtils.getAndReadFile(account, message).then(([imageData, filename]) => {
                setImage(imageData)
                message.filename = filename;
                setMessage(message)
                setShowModal(true)
            })
        }

        const sendDisplayed = (message) => {
            if (message.state == 'received'
                && message.dispositionState !== 'displayed'
                && message.dispositionNotification.indexOf('display') !== -1
            ) {
                displayed(message.sender.uri, message.id, message.timestamp, 'displayed')
            }
        };

        const entries = messages.filter((message) => {
            return !message.content.startsWith('?OTRv');
        }).map((message) => {
            let continues = false;
            if (prevMessage !== null && prevMessage.sender.uri == message.sender.uri) {
                continues = true;
            }
            if (prevMessage === null || formatTime(prevMessage) !== formatTime(message)) {
                timestamp = (<div style={{ padding: '5px 15px 0 15px' }}><DividerWithText>{formatTime(message)}</DividerWithText></div>);
                continues = false;
            } else {
                timestamp = null;
            }
            prevMessage = message;
            const messageComponents = {
                default: Message,
                fileTransfer: FileTransferMessage
            };
            let MessageComponent = messageComponents['default'];
            let extraProps = {}
            if (message.contentType == ('application/sylk-file-transfer')) {
                MessageComponent = messageComponents['fileTransfer']
                extraProps = {
                    account: account,
                    showModal: () => getImage(message),
                    downloadFiles: downloadFiles
                }

            }
            return (
                <CSSTransition
                    key={message.id}
                    timeout={1000}
                    classNames="message"
                >
                    <React.Fragment key={message.id}>
                        {timestamp}
                        <MessageComponent
                            displayed={() => sendDisplayed(message)}
                            focus={focus === message.id}
                            message={message}
                            cont={continues}
                            scroll={scrollToBottom}
                            contactCache={contactCache}
                            removeMessage={() => removeMessage(message)}
                            imdnStates
                            enableMenu
                            {...extraProps}
                        />
                    </React.Fragment>
                </CSSTransition>
            )
        });
        if (!ignore) {
            setEntries(entries);
        }
        return () => {
            ignore = true;
        }
    }, [messages, focus, displayed, scrollToBottom, contactCache, removeMessage, account, downloadFiles]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const canLoadMore = () => {
            if (hasMore) {
                Promise.resolve(hasMore()).then((value) => {
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
    }, [entries, display]) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        DEBUG('Top is now %s', inView ? 'visible' : 'hidden');
        if (inView) {
            loadMore();
        }
    }, [inView, loadMore]);

    useEffect(() => {
        let ignore = false;
        if (inView && storageLoadEmpty && more && loading) {
            if (hasMore) {
                Promise.resolve(hasMore()).then((value) => {
                    if (!ignore) {
                        setMore(value);
                        setLoading(value);
                    }
                });
            }
        }

        return () => {
            ignore = true;
        }
    }, [storageLoadEmpty, inView, loading, more, messages, hasMore]);

    return (
        <div
            className="drawer-chat"
            ref={messagesRef}
            style={{ visibility: display ? 'visible' : 'hidden' }}
        >
            <ImagePreviewModal
                show={showModal}
                close={() => setShowModal(false)}
                image={image}
                contactCache={contactCache}
                message={message}
                openInNewTab={(...args) => fileTransferUtils.openInNewTab(account, ...args)}
                download={downloadFiles}
                removeMessage={removeMessage}
            />
            {more === true &&
                <div ref={ref}>
                    <CircularProgress style={{ color: '#888', margin: 'auto', display: 'block' }} />
                </div>
            }
            {embed ?
                entries
                :
                <DragAndDrop title="Drop files to share them" handleDrop={uploadFiles} marginTop={'100px'}>
                    <TransitionGroup>
                        {entries}
                    </TransitionGroup>
                </DragAndDrop>
            }
            <div ref={messagesEndRef} />
        </div>
    );
};

MessageList.propTypes = {
    scroll: PropTypes.bool,
    messages: PropTypes.array.isRequired,
    focus: PropTypes.string,
    loadMoreMessages: PropTypes.func.isRequired,
    removeMessage: PropTypes.func.isRequired,
    hasMore: PropTypes.func.isRequired,
    displayed: PropTypes.func.isRequired,
    contactCache: PropTypes.object,
    account: PropTypes.object.isRequired,
    uploadFiles: PropTypes.func,
    downloadFiles: PropTypes.func.isRequired,
    embed: PropTypes.bool,
    storageLoadEmpty: PropTypes.bool
};


module.exports = MessageList;
