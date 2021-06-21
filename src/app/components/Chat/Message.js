'use strict';

const React         = require('react');
const useState      = React.useState;
const useEffect     = React.useEffect;
const useRef        = React.useRef;
const PropTypes     = require('prop-types');
const { default: clsx } = require('clsx');
const ReactBootstrap    = require('react-bootstrap');
const Media             = ReactBootstrap.Media;
const { default: parse } = require('html-react-parser');
const linkifyUrls        = require('linkify-urls');
const { DateTime }       = require('luxon');
const { Chip }           = require('@material-ui/core');
const { makeStyles }     = require('@material-ui/core/styles');
const { Lock: LockIcon, Done: DoneIcon, DoneAll: DoneAllIcon} = require('@material-ui/icons');
const VizSensor          = require('react-visibility-sensor').default;

const UserIcon          = require('../UserIcon');


const styleSheet = makeStyles((theme) => ({
    chipSmall: {
        height: 18,
        fontSize: 11
    },
    iconSmall: {
        width: 12,
        height: 12
    },
    doneIcon: {
        fontSize: 15,
        verticalAlign: 'middle',
        color: 'green'
    }
}));

const Message = ({
    message,
    scroll,
    cont,
    displayed,
    focus,
    contactCache
}) => {
    const classes = styleSheet();
    const [state, setState] = useState('');
    const [parsedContent, setParsedContent] = useState();
    const messageRef = useRef(null);

    const sender = message.sender.displayName ||  message.sender.uri;
    const time = DateTime.fromJSDate(message.timestamp).toFormat('HH:mm');

    const htmlEntities = (str) => {
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    useEffect(() => {
        if (parsedContent !== undefined) {
            scroll()
        }}, [parsedContent, scroll]
    );

    useEffect(() => {
        if (message.contentType === 'text/html') {
            setParsedContent(parse(message.content.trim(), {
                replace: (domNode) => {
                    if (domNode.attribs && domNode.attribs.href) {
                        domNode.attribs.target = '_blank';
                        return;
                    }
                    if (domNode.type === 'text') {
                        if (!domNode.parent || (domNode.parent.type === 'tag' && domNode.parent.name !== 'a')) {
                            let url = linkifyUrls(htmlEntities(domNode.data), {
                                attributes: {
                                    target : '_blank',
                                    rel    : 'noopener noreferrer'
                                }
                            });
                            return (<span>{parse(url)}</span>);
                        }
                    }
                }
            }));
        } else if (message.contentType.startsWith('image/')) {
            const image = `data:${message.contentType};base64,${btoa(message.content)}`
            setParsedContent(<img className="img-responsive" src={image} />);
        } else if (message.contentType === 'text/plain') {
            const linkfiedContent = linkifyUrls(htmlEntities(message.content), {
                attributes: {
                    target : '_blank',
                    rel    : 'noopener noreferrer'
                }
            })

            setParsedContent  (
                <pre>{parse(linkfiedContent)}</pre>
            );
        } else if (message.contentType === 'text/pgp-public-key') {
            setParsedContent(
                <Chip
                    component="span"
                    classes={{sizeSmall: classes.chipSmall, iconSmall: classes.iconSmall}}
                    variant="outlined"
                    size="small"
                    icon={<LockIcon />}
                    label="Public key"
                />
            );
        }


        if (message instanceof require('events').EventEmitter && message.state === 'pending') {
            message.on('stateChanged', (oldState, newState) => {
                setState(newState);
            });
        }
        setState(message.state);
    }, [message, classes])

    const scrollToMessage = () => {
        messageRef.current.scrollIntoView({behavior: 'smooth'})
    };

    useEffect(() => {
        if (messageRef.current !== null && focus === true) {
            scrollToMessage()
        }
    }, [focus]);

    let theme = clsx({
        'text-left'     : true,
        'pending'       : state === 'pending',
        'text-danger'   : state === 'failed',
        'continued'     : cont && message.type !== 'status',
        'status'        : message.type === 'status'
    });

    const isDisplayed = () => {
        if (displayed) {
            displayed();
        }
    };

    const statusIcon = () => {
        if (state === 'accepted') {
            return (<DoneIcon style={{color: '#888'}} className={classes.doneIcon}/>);
        }
        if (state === 'delivered') {
            return (<DoneIcon className={classes.doneIcon}/>);
        }
        if (state === 'displayed') {
            return (<DoneAllIcon className={classes.doneIcon} />);
        }
    };

    const getDisplayName = (uri) => {
        if (contactCache !== undefined && contactCache.has(uri)) {
                return {uri: uri, displayName: contactCache.get(uri)};
        }
        return {uri: uri};
    };

    if (cont || message.type === 'status') {
        return (
            <VizSensor partialVisibility={true} onChange={isDisplayed}>
                <Media className={theme}>
                    <div ref={messageRef} />
                    <Media.Left className="timestamp-continued">
                        <span>{time}</span>
                    </Media.Left>
                    <Media.Body className="vertical-center">
                        {parsedContent}
                    </Media.Body>
                    <Media.Right>
                        <span className="pull-right" style={{paddingRight: '15px'}}>{statusIcon()}</span>
                    </Media.Right>
                </Media>
            </VizSensor>
        );
    }

    return (
        <VizSensor partialVisibility={true} onChange={isDisplayed}>
            <Media className={theme}>
                <div ref={messageRef} />
                <Media.Left>
                    <UserIcon identity={getDisplayName(message.sender.uri)} />
                </Media.Left>
                <Media.Body className="vertical-center">
                    <Media.Heading>{getDisplayName(message.sender.uri).displayName || sender} <span>{time}</span><span className="pull-right" style={{paddingRight: '15px'}}>{statusIcon()}</span></Media.Heading>
                    {parsedContent}
                </Media.Body>
            </Media>
        </VizSensor>
    );
};

Message.propTypes = {
    message: PropTypes.object.isRequired,
    scroll: PropTypes.func.isRequired,
    cont: PropTypes.bool,
    displayed: PropTypes.func,
    focus: PropTypes.bool,
    contactCache: PropTypes.object
};


module.exports = Message;
