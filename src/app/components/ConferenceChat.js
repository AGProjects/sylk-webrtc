'use strict';

const React         = require('react');
const useEffect     = React.useEffect;
const useRef        = React.useRef;
const useState      = React.useState;
const PropTypes     = require('prop-types');
const Message       = require('./Chat/Message');
const { useAddressbook } = require('../AddressbookProvider');


const ConferenceChat = (props) => {
    const messagesEndRef = useRef(null);
    const ab = useAddressbook();
    const scrollToBottom = () => {
        messagesEndRef.current.scrollIntoView({behavior: 'smooth'})
    }

    useEffect(scrollToBottom, [props.scroll]);

    const [entries, setEntries] = useState([])

    useEffect(() => {
        let prevMessage = null;
        const entries = props.messages.filter((message) => {
            return !message.content.startsWith('?OTRv')
        }).map((message, idx) => {
            let continues = false;
            if (prevMessage !== null  && prevMessage.sender.uri == message.sender.uri) {
                continues = true;
            }
            prevMessage = message;
            const fromSelf = !!props.selfUri && message.sender.uri.toLowerCase() === props.selfUri.toLowerCase();
            const identity = !fromSelf && ab
                ? ab.lookup({ uri: message.sender.uri, displayName: message.sender.displayName }).identity
                : message.sender;
            return (
                <Message key={idx} message={message} cont={continues} scroll={scrollToBottom} identity={identity} />
            )
        });
        setEntries(entries);
    }, [props.messages, props.selfUri, ab])

    return (
        <div className="drawer-chat">
            {entries}
            <div ref={messagesEndRef} />
        </div>
    );
};

ConferenceChat.propTypes = {
    scroll: PropTypes.bool,
    messages: PropTypes.array.isRequired,
    selfUri: PropTypes.string
};


module.exports = ConferenceChat;
