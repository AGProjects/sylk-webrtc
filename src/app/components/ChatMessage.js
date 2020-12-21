'use strict';

const React         = require('react');
const useState      = React.useState;
const PropTypes     = require('prop-types');
const { default: clsx } = require('clsx');
const ReactBootstrap    = require('react-bootstrap');
const Media             = ReactBootstrap.Media;
const parse             = require('html-react-parser');
const linkifyUrls       = require('linkify-urls');
const { DateTime }      = require('luxon');

const UserIcon          = require('./UserIcon');


const ChatMessage = (props) => {
    let [state, setState] = useState(props.message.state);

    const message = props.message;
    const sender = message.sender.displayName ||  message.sender.uri;
    const time = DateTime.fromJSDate(message.timestamp).toFormat('HH:mm');

    const htmlEntities = (str) => {
            return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    let parsedContent;
    if (message.contentType === 'text/html') {
        parsedContent = parse(message.content.trim(), {
            replace: ({attribs}) => {
                if (attribs && attribs.href) {
                    attribs.target = '_blank';
                    return;
                }
            }
        });
    } else if (message.contentType.startsWith('image/')) {
        const image = `data:${message.contentType};base64,${btoa(message.content)}`
        parsedContent = (<img className="img-responsive" src={image} />);
    } else if (message.contentType === 'text/plain') {
        const linkfiedContent = linkifyUrls(htmlEntities(message.content), {
            attributes: {
                target : '_blank',
                rel    : 'noopener noreferrer'
            }
        })

        parsedContent = (
            <pre>{parse(linkfiedContent)}</pre>
        );
    }


    if (message.state === 'pending') {
        message.on('stateChanged', (oldState, newState) => {
            setState(newState);
        });
    }

    let theme = clsx({
        'text-left'     : true,
        'pending'       : state === 'pending',
        'text-danger'   : state === 'failed',
        'continued'     : props.cont && message.type !== 'status',
        'status'        : message.type === 'status'
    });

    if (props.cont || message.type === 'status') {
        return (
            <Media className={theme}>
                <Media.Body className="vertical-center">
                    {parsedContent}
                </Media.Body>
            </Media>
        );
    }
    return (
        <Media className={theme}>
            <Media.Left>
                <UserIcon identity={message.sender} />
                </Media.Left>
            <Media.Body className="vertical-center">
                <Media.Heading>{sender} <span>{time}</span></Media.Heading>
                {parsedContent}
            </Media.Body>
        </Media>
    );
};

ChatMessage.propTypes = {
    message: PropTypes.object.isRequired,
    cont: PropTypes.bool
};


module.exports = ChatMessage;
