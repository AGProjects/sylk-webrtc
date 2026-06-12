'use strict';

const React = require('react');
const {
    useEffect,
    useState,
    useRef
} = React;
const { default: clsx } = require('clsx');
const debug = require('debug');
const PropTypes = require('prop-types');
const xss = require('xss');
const { DateTime } = require('luxon');
const { makeStyles } = require('@material-ui/core/styles');
const {
    Avatar,
    ListSubheader,
    List,
    ListItem,
    ListItemAvatar,
    ListItemSecondaryAction,
    ListItemText,
    IconButton,
    Grid,
    Typography,
    Divider,
    MenuItem,
    Chip
} = require('@material-ui/core');
const {
    Lock: LockIcon,
    Done: DoneIcon,
    DoneAll: DoneAllIcon,
    ErrorOutline: ErrorOutlineIcon,
    GetApp: DownloadIcon,
    GraphicEqRounded
} = require('@material-ui/icons');

const UserIcon = require('../UserIcon');
const CustomContextMenu = require('../CustomContextMenu');
const DragAndDrop = require('../DragAndDrop');
const ContactListContact = require('./ContactListContact').default;

const { useAddressbook } = require('../../AddressbookProvider');

const DEBUG = debug('blinkrtc:ContactList');


const formatTime = (message) => {
    const date = DateTime.fromJSDate(message.timestamp);
    const diff = date.diff(DateTime.local().startOf('day'), 'days').as('days');
    const yearDiff = date.diff(DateTime.local().startOf('year'), 'year').as('year');

    if (yearDiff <= 0) {
        return date.toFormat('dd/LL/yy');
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
        return date.toFormat('HH:mm');
    }
    return date.toFormat('dd/LL');
};


const styleSheet = makeStyles((theme) => ({
    header: {
        fontSize: '17px',
        fontFamily: 'inherit'
    },
    date: {
        fontSize: '14px',
        fontFamily: 'inherit',
        color: '#888'
    },
    root: {
        fontSize: '14px',
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    selected: {
        '&:before': {
            backgroundColor: '#EBEBEB',
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: -15,
            right: -15,
            zIndex: -1,
            content: '""'
        }
    },
    listItem: {
        '&:before': {
            backgroundColor: '#fff',
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: -15,
            right: -15,
            zIndex: -1,
            content: '""'
        }
    },
    subheader: {
        fontFamily: 'inherit',
        fontSize: 16,
        textTransform: 'uppercase',
        height: '66px',
        lineHeight: '66px',
        color: '#333'
    },
    scrollable: {
        overflow: 'auto',
        marginRight: -15,
        paddingRight: 15,
        marginLeft: -15,
        paddingLeft: 15,
        scrollbarWidth: 'thin'
    },
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
        fontSize: 15,
        verticalAlign: 'middle',
        color: '#a94442'
    },
    item: {
        fontSize: '14px',
        fontFamily: 'inherit',
        color: '#333',
        minHeight: 0
    },
    danger: {
        color: '#d9534f'
    },
    grid: {
        flexShrink: 0,
        marginLeft: 4
    }
}));

const ContactList = (props) => {
    const classes = styleSheet(props);
    const [anchorEl, setAnchorEl] = useState(null);
    const contactRef = useRef(null);
    const anchorElRef = useRef(null);
    const [subMenuAnchor, setSubMenuAnchor] = useState(null);
    const { addressbook, actions, lookup } = useAddressbook();

    const filteredMessages = props.filter ?
        Object.values(props.messages)
            .flat()
            .filter(contact =>
                contact.content.indexOf(props.filter) !== -1 && contact.contentType !== 'text/pgp-public-key'
            )
            .map(message => {
                let uri = message.state === 'received' ? message.sender.uri : message.receiver;
                return {
                    ...message,
                    uri: uri,
                    contact: lookup(uri)
                }
            })
        :
        [];

    const handleSetAnchorEl = (virtualEl) => {
        anchorElRef.current = virtualEl;
        setAnchorEl(() => anchorElRef.current);
    };

    const contacts = React.useMemo(() => {
        const filterLower = props.filter.toLowerCase();

        const contactMap = new Map();

        for (const contactList of addressbook.contacts.values()) {
            for (const contact of contactList) {
                if (!contactMap.has(contact)) {
                    contactMap.set(contact, {
                        ...contact,
                        message: null
                    });
                }
            }
        }

        for (const [uri, msgs] of Object.entries(props.messages)) {
            if (!msgs?.length) continue;

            let candidate = msgs[msgs.length - 1];

            if (candidate.content.startsWith('?OTRv')) {
                for (let i = 2; i <= msgs.length; i++) {
                    candidate = msgs[msgs.length - i];
                    if (!candidate.content.startsWith('?OTRv')) break;
                }
            }

            const contactsForUri = addressbook.contacts.get(uri);
            if (contactsForUri?.length) {
                for (const contact of contactsForUri) {
                    const enriched = contactMap.get(contact);
                    if (
                        !enriched.message ||
                        candidate.timestamp > enriched.message.timestamp
                    ) {
                        enriched.message = candidate;
                    }
                }
            } else {
                let contact = lookup(uri);
                contactMap.set(uri, { ...contact, message: candidate });
            }
        }

        for (const contact of (props.newContacts || [])) {
            if (!contactMap.has(contact.defaultUri.uri)) {
                contactMap.set(contact.defaultUri.uri, {
                    ...contact,
                    message: null,
                    _isNew: true
                });
            }
        }

        const result = Array.from(contactMap.values()).filter(c =>
            c.name.toLowerCase().includes(filterLower) ||
            c.uris?.some(u => u.uri.toLowerCase().includes(filterLower))
        );

        result.sort((a, b) => a.name.localeCompare(b.name))
        result.sort(
            (a, b) => {
                if (a._isNew) return -1;
                if (b._isNew) return 1;
                return (b.message?.timestamp || 0) - (a.message?.timestamp || 0)
            }
        );
        return result;

    }, [addressbook.contacts, props.messages, props.filter, props.newContacts, lookup]);

    const unreadMessages = React.useMemo(() => {
        const tnumbers = {}
        for (const [key, messages] of Object.entries(props.messages)) {
            let counter = 0;
            for (let message of messages) {
                if (message.state === 'received'
                    && message.dispositionState !== 'displayed'
                    && message.dispositionNotification.indexOf('display') !== -1
                    && !message.content.startsWith('?OTRv')
                ) {
                    counter++;
                }
            }
            tnumbers[key] = counter;
        }
        return tnumbers
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.messages, props.calcUnread]);

    const statusIcon = (message) => {
        const state = message.state;
        if (state === 'accepted') {
            return (<DoneIcon style={{ color: '#888' }} className={classes.doneIcon} />);
        }
        if (state === 'delivered') {
            return (<DoneIcon className={classes.doneIcon} />);
        }
        if (state === 'displayed') {
            return (<DoneAllIcon className={classes.doneIcon} />);
        }
        if (state === 'failed') {
            return (<ErrorOutlineIcon className={classes.errorOutlineIcon} />);
        }
        if (state === 'error') {
            return (<ErrorOutlineIcon className={classes.errorOutlineIcon} />);
        }
    };

    const parseContent = (message, contact) => {
        const contentType = message.contentType;
        if (contentType === 'text/html') {
            const content = xss(message.content, {
                whiteList: [], // empty, means filter out all tags
                stripIgnoreTag: true, // filter out all HTML not in the whitelist
                stripIgnoreTagBody: ['script', 'style'] // the script tag is a special case, we need
                // to filter out its content
            }).replace(/&nbsp;/g, ' ');
            return content;
        } else if (contentType === 'text/plain') {
            return message.content;
        } else if (contentType === 'text/pgp-public-key') {
            return (
                <Chip
                    component="span"
                    classes={{ sizeSmall: classes.chipSmall, iconSmall: classes.iconSmall }}
                    variant="outlined"
                    size="small"
                    icon={<LockIcon />}
                    label="Public key"
                />
            );
        } else if (message.contentType == ('application/sylk-file-transfer')) {
            let file = message.json;
            if (file.filename.startsWith('sylk-audio-recording')) {
                return (
                    <Chip
                        component="span"
                        classes={{ sizeSmall: classes.chipSmall, iconSmall: classes.iconSmall }}
                        variant="outlined"
                        size="small"
                        icon={<GraphicEqRounded />}
                        label="Voice Message"
                        onClick={(event) => { event.stopPropagation(); event.preventDefault(); props.selectAudio(message) }}
                    />
                );
            }
            return (
                <Chip
                    component="span"
                    classes={{ sizeSmall: classes.chipSmall, iconSmall: classes.iconSmall }}
                    variant="outlined"
                    size="small"
                    icon={<DownloadIcon />}
                    label={file.filename.replace(/_/g, ' ').replace('.asc', '')}
                    onClick={(event) => { event.stopPropagation(); event.preventDefault(); props.downloadFiles(file) }}
                />
            );
        }
    };


    const getHighlightedText = (text, highlight) => {
        // Split on highlight term and include term into parts, ignore case
        if (text === undefined || typeof text === 'object' && text !== null) {
            return;
        }

        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                (
                    <span key={i} style={part.toLowerCase() === highlight.toLowerCase() ? { fontWeight: 'bold' } : {}}>
                        {part}
                    </span>
                )
                )}
            </span>
        );
    }

    const switchChat = (contact, id) => {
        DEBUG(contact)
        props.loadMessages(contact, id);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const setDefaultUri = (event, uri) => {
        event.preventDefault();
        const updatedUris = (contactRef.current.uris ?? []).map(u => ({ ...u, default: u.id === uri.id }));

        actions.update({
            ...contactRef.current,
            uris: updatedUris, defaultUri: uri
        })
            .then(() => {
                // setSubMenuAnchor(null);
            })
            .catch((err) => {
                DEBUG('Error updating default uri', err);
            });
    };

    return (<div className={classes.scrollable}>
        <List disablePadding>
            {props.filter && props.defaultDomain && Object.keys(props.messages).indexOf(props.filter) === -1 &&
                [
                    <ListItem key="new" style={{ height: '66px' }}>
                        Start a new chat to {props.filter.indexOf('@') === -1 ? `${props.filter}@${props.defaultDomain}` : props.filter}
                        <ListItemSecondaryAction>
                            <IconButton aria-label="add" edge="end" onClick={props.startChat} className={classes.margin}>
                                <i className="fa fa-plus fa-2x" />
                            </IconButton>
                        </ListItemSecondaryAction>
                    </ListItem>,
                    <Divider component="li" key="divider" />
                ]
            }
            {props.filter && contacts.length !== 0 &&
                <React.Fragment>
                    <ListSubheader key="chatHeader" className={classes.subheader}>Chats</ListSubheader>
                    <Divider component="li" key="divider" variant="inset" />
                </React.Fragment>
            }
            <CustomContextMenu
                open={Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose={handleClose}
                keepMounted
                key="menu"
            >
                <MenuItem className={classes.item} onClick={() => { props.editContact(contactRef.current); handleClose() }} onMouseEnter={() => setSubMenuAnchor(null)}>
                    Edit Contact
                </MenuItem>
                {contactRef?.current?.uris.length > 1 &&
                    <MenuItem className={classes.item}
                        onClick={(e) => setSubMenuAnchor(e.currentTarget)}
                        onMouseEnter={(e) => setSubMenuAnchor(e.currentTarget)}
                        selected={Boolean(subMenuAnchor)}
                    >
                        Set Default Address
                        <CustomContextMenu
                            style={{ pointerEvents: 'none' }}
                            anchorEl={subMenuAnchor}
                            open={Boolean(subMenuAnchor)}
                            onClose={() => setSubMenuAnchor(null)}
                            placement="right-start"
                            keepMounted
                        >
                            {contactRef.current.uris.map(uri => (
                                <MenuItem className={classes.item} key={uri.id} onClick={(event) => { event.stopPropagation(); setSubMenuAnchor(null); handleClose(); setDefaultUri(event, uri) }}>
                                    {uri.uri} {uri.id === contactRef.current.defaultUri.id && '(Default)'}
                                </MenuItem>
                            ))}
                        </CustomContextMenu>

                    </MenuItem>
                }
                <Divider />
                <MenuItem className={classes.item} onClick={() => { props.removeChat(contactRef.current); handleClose() }} onMouseEnter={() => setSubMenuAnchor(null)}>
                    Remove Chat
                </MenuItem>
                <MenuItem className={clsx(classes.item, classes.danger)} onClick={() => { props.deleteContact(contactRef.current); handleClose() }} onMouseEnter={() => setSubMenuAnchor(null)}>
                    Delete Contact
                </MenuItem>
            </CustomContextMenu>
            {contacts.map(contact => {
                return (
                    <ContactListContact
                        key={contact.id}
                        contact={contact}
                        selectedContact={props.selectedContact}
                        unreadMessages={unreadMessages}
                        filter={props.filter}
                        switchChat={switchChat}
                        uploadFiles={props.uploadFiles}
                        classes={classes}
                        getHighlightedText={getHighlightedText}
                        parseContent={parseContent}
                        formatTime={formatTime}
                        statusIcon={statusIcon}
                        contactRef={contactRef}
                        setAnchorEl={handleSetAnchorEl}
                    />
                )
            })}
            {props.filter && filteredMessages.length !== 0 &&
                <React.Fragment>
                    <ListSubheader key="messageHeader" className={classes.subheader}>Messages</ListSubheader>
                    <Divider component="li" key="divider" />
                    {filteredMessages.map(message => (
                        [
                            <ListItem
                                className={classes.listItem} alignItems="flex-start"
                                key={message.id}
                                onClick={() => {
                                    switchChat(message.contact, message.id)
                                }}
                                disableGutters
                            >
                                <ListItemText
                                    secondaryTypographyProps={{ className: classes.root }}
                                    primary={
                                        <React.Fragment>
                                            <Grid container spacing={2} justifyContent="space-between" alignItems="baseline">
                                                <Grid item zeroMinWidth>
                                                    <Typography
                                                        variant="h4"
                                                        className={classes.header}
                                                        style={{ flexGrow: 1 }}
                                                    >
                                                        {message.contact?.name || message.uri}
                                                    </Typography>
                                                </Grid>
                                                <Grid item className={classes.grid}>
                                                    <Typography className={classes.date}>
                                                        {message && statusIcon(message)}
                                                        {message && formatTime(message)}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </React.Fragment>
                                    }
                                    secondary={message && getHighlightedText(parseContent(message, message.uri), props.filter)}
                                />
                            </ListItem>,
                            <Divider component="li" key={`divider_${message.id}`} />
                        ]
                    ))}
                </React.Fragment>
            }
        </List>
    </div>);
}

ContactList.propTypes = {
    messages: PropTypes.object.isRequired,
    loadMessages: PropTypes.func.isRequired,
    startChat: PropTypes.func.isRequired,
    removeChat: PropTypes.func.isRequired,
    defaultDomain: PropTypes.string.isRequired,
    filter: PropTypes.string,
    selectedContact: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    selectAudio: PropTypes.func.isRequired,
    calcUnread: PropTypes.string,
    downloadFiles: PropTypes.func,
    uploadFiles: PropTypes.func.isRequired,
    editContact: PropTypes.func.isRequired,
    deleteContact: PropTypes.func.isRequired,
    newContacts: PropTypes.array.isRequired
};


module.exports = ContactList;
