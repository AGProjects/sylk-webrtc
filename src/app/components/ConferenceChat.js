'use strict';

const React         = require('react');
const useEffect     = React.useEffect;
const useRef        = React.useRef;
const useState        = React.useState;
const PropTypes     = require('prop-types');
const ChatMessage   = require('./ChatMessage');


const ConferenceChat = (props) => {
    const messagesEndRef = useRef(null);

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
            return (
                <ChatMessage key={idx} message={message} cont={continues} scroll={scrollToBottom}/>
            )
        });
        setEntries(entries);
    }, [props.messages])

    return (
        <div className="drawer-chat">
            {entries}
            <div ref={messagesEndRef} />
        </div>
    );
};

ConferenceChat.propTypes = {
    scroll: PropTypes.bool,
    messages: PropTypes.array.isRequired
};


module.exports = ConferenceChat;
