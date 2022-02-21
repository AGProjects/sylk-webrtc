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
const { Chip, Divider, MenuItem } = require('@material-ui/core');
const { makeStyles }     = require('@material-ui/core/styles');
const {
    Lock: LockIcon,
    Done: DoneIcon,
    DoneAll: DoneAllIcon,
    ErrorOutline: ErrorOutlineIcon
} = require('@material-ui/icons');
const { useInView }      = require('react-intersection-observer');

const CustomContextMenu = require('../CustomContextMenu');
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
    },
    errorOutlineIcon: {
        fontSize: 17,
        verticalAlign: 'middle',
        color: '#a94442'
    },
    item: {
        fontSize: '14px',
        fontFamily: 'inherit',
        color: '#333',
        minHeight: 0
    },
    lockIcon: {
        fontSize: 15,
        verticalAlign: 'middle',
        color: '#ccc'
    }
}));

const Message = ({
    message,
    scroll,
    cont,
    displayed,
    focus,
    contactCache,
    removeMessage,
    imdnStates,
    enableMenu
}) => {
    const classes = styleSheet();
    const [state, setState] = useState('');
    const [parsedContent, setParsedContent] = useState();
    const messageRef = useRef(null);
    const [anchorEl, setAnchorEl] = useState(null);

    const sender = message.sender.displayName ||  message.sender.uri;
    const time = DateTime.fromJSDate(message.timestamp).toFormat('HH:mm');
    const { ref, inView, entry } = useInView({
        threshold: 0
    });

    const preHtmlEntities = (str) => {
        return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    };

    const postHtmlEntities = (str) => {
        return String(str).replace(/(?!&amp;|&lt;|&gt;|&quot;)&/g, '&amp;');
    };

    const customUrlRegexp = () => (/((?:https?(?::\/\/))(?:www\.)?(?:[a-zA-Z\d-_.]+(?:(?:\.|@)[a-zA-Z\d]{2,})|localhost)(?:(?:[-a-zA-Z\d:%_+.~#!?&//=@();]*)(?:[,](?![\s]))*)*)/g);

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
                            let url = linkifyUrls(preHtmlEntities(domNode.data), {
                                customUrlRegexp,
                                attributes: {
                                    target : '_blank',
                                    rel    : 'noopener noreferrer'
                                }
                            });
                            return (<span>{parse(postHtmlEntities(url))}</span>);
                        }
                    }
                }
            }));
        } else if (message.contentType.startsWith('image/')) {
            const image = `data:${message.contentType};base64,${btoa(message.content)}`
            setParsedContent(<img className="img-responsive" src={image} />);
        } else if (message.contentType === 'text/plain') {
            const linkfiedContent = linkifyUrls(preHtmlEntities(message.content), {
                customUrlRegexp,
                attributes: {
                    target : '_blank',
                    rel    : 'noopener noreferrer'
                }
            })

            setParsedContent  (
                <pre>{parse(postHtmlEntities(linkfiedContent))}</pre>
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

        const finalStates = new Set(['displayed', 'received']);

        const stateChanged = (oldState, newState) => {
            setState(newState);
        };

        if (message instanceof require('events').EventEmitter
            && (message.state === 'pending' || (imdnStates && !finalStates.has(message.state)))
        ) {
            message.on('stateChanged', stateChanged);
        }
        setState(message.state);

        return () => {
            if (message instanceof require('events').EventEmitter) {
                message.removeListener('stateChanged', stateChanged);
            }
        }
    }, [message, classes]) // eslint-disable-line react-hooks/exhaustive-deps

    const scrollToMessage = () => {
        messageRef.current.scrollIntoView({behavior: 'smooth'})
    };

    useEffect(() => {
        if (messageRef.current !== null && focus === true) {
            scrollToMessage()
        }
    }, [focus]);

    useEffect(() => {
        if (inView) {
            isDisplayed();
        }
    }, [inView, isDisplayed]);

    const isDisplayed = React.useCallback(() => {
        if (displayed) {
            displayed();
        }
    }, [displayed]);

    let theme = clsx({
        'text-left'     : true,
        'pending'       : state === 'pending',
        'text-danger'   : state === 'failed' || state === 'error',
        'continued'     : cont && message.type !== 'status',
        'status'        : message.type === 'status'
    });

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
        if (state === 'failed') {
            return (<ErrorOutlineIcon className={classes.errorOutlineIcon} titleAccess="Not Delivered"/>);
        }
        if (state === 'error') {
            return (<ErrorOutlineIcon className={classes.errorOutlineIcon} titleAccess="Display Error"/>);
        }
    };

    const getDisplayName = (uri) => {
        if (contactCache !== undefined && contactCache.has(uri)) {
                return {uri: uri, displayName: contactCache.get(uri)};
        }
        return {uri: uri};
    };

    const handleContextMenu = (e) => {
	e.preventDefault();
	const { clientX, clientY } = e;
	const virtualElement = {
            clientWidth: 0,
            clientHeight: 0,
            getBoundingClientRect: () => ({
                width: 0,
                height: 0,
                top: clientY,
		right: clientX,
                bottom: clientY,
                left: clientX
            })
        };
	setAnchorEl(virtualElement);
    }

    const copy = () => {
        let selection = window.getSelection();
        if (selection.toString() === '') {
            selection = message.content;
        }
        if ('clipboard' in navigator) {
            navigator.clipboard.writeText(selection);
        } else {
            document.execCommand('copy', true, selection);
        }
    };

    const _removeMessage = () => {
        if (typeof removeMessage === 'function') {
            removeMessage();
        }
    }

    const handleClose = () => {
        setAnchorEl(null);
    };

    if (cont || message.type === 'status') {
        return (
            <div ref={ref}>
                <Media className={theme} onContextMenu = {handleContextMenu}>
                    {enableMenu && message.type !== 'status' &&
                        <CustomContextMenu
                            open = {Boolean(anchorEl)}
                            anchorEl={anchorEl}
                            onClose = {handleClose}
                            keepMounted = {false}
                        >
                            <MenuItem className={classes.item} onClick={() => {copy(); handleClose()}}>
                                Copy
                            </MenuItem>
                            <Divider />
                            <MenuItem className={classes.item} onClick={() => {_removeMessage(); handleClose()}}>
                                Remove Message
                            </MenuItem>
                        </CustomContextMenu>
                    }

                    <div ref={messageRef} />
                    { message.type !== 'status' &&
                         <Media.Left className="timestamp-continued"><span>{time}</span></Media.Left>
                    }
                    <Media.Body className="vertical-center">
                        {parsedContent}
                    </Media.Body>
                    <Media.Right>
                        <span className="pull-right" style={{paddingRight: '15px', whiteSpace: 'nowrap'}}>
                            {message.isSecure && <LockIcon className={classes.lockIcon} />}
                            {statusIcon()}
                            { message.type === 'status' &&
                                <pre>{time}</pre>
                            }
                        </span>
                    </Media.Right>
                </Media>
            </div>
        );
    }

    return (
        <div ref={ref}>
            <Media className={theme} onContextMenu = {handleContextMenu}>
                {enableMenu &&
                    <CustomContextMenu
                        open = {Boolean(anchorEl)}
                        anchorEl={anchorEl}
                        onClose = {handleClose}
                        keepMounted = {false}
                    >
                        <MenuItem className={classes.item} onClick={() => {copy(); handleClose()}}>
                            Copy
                        </MenuItem>
                        <Divider />
                        <MenuItem className={classes.item} onClick={() => {_removeMessage(); handleClose()}}>
                            Remove Message
                        </MenuItem>
                    </CustomContextMenu>
                }
                <div ref={messageRef} />
                <Media.Left>
                    <UserIcon identity={getDisplayName(message.sender.uri)} />
                </Media.Left>
                <Media.Body className="vertical-center">
                    <Media.Heading>
                        {getDisplayName(message.sender.uri).displayName || sender}&nbsp;
                        <span>{time}</span>
                        <span className="pull-right" style={{paddingRight: '15px'}}>
                            {message.isSecure && <LockIcon className={classes.lockIcon} />}
                            {statusIcon()}
                        </span>
                    </Media.Heading>
                    {parsedContent}
                </Media.Body>
            </Media>
        </div>
    );
};

Message.propTypes = {
    message: PropTypes.object.isRequired,
    scroll: PropTypes.func.isRequired,
    removeMessage: PropTypes.func,
    cont: PropTypes.bool,
    displayed: PropTypes.func,
    focus: PropTypes.bool,
    contactCache: PropTypes.object,
    imdnStates: PropTypes.bool,
    enableMenu: PropTypes.bool
};


module.exports = Message;
