'use strict';

const React             = require('react');
const {
    useEffect,
    useState,
    useRef
} = React;
const debug             = require('debug');
const PropTypes         = require('prop-types');
const xss               = require('xss');
const { DateTime }      = require('luxon');
const { makeStyles }    = require('@material-ui/core/styles');
const {
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
    DoneAll: DoneAllIcon
} = require('@material-ui/icons');

const UserIcon = require('../UserIcon');
const CustomContextMenu = require('../CustomContextMenu');

const DEBUG = debug('blinkrtc:ContactList');


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
    item: {
        fontSize: '14px',
        fontFamily: 'inherit',
        color: '#333',
        minHeight: 0
    }
}));

const ContactList = (props) => {
    const classes = styleSheet(props);
    const [filteredMessages, setFilteredMessages] = useState([]);
    const [anchorEl, setAnchorEl] = useState(null);
    const contactRef = useRef(null);

    useEffect(() => {
        if (props.filter !== '') {
            setFilteredMessages(
                [].concat.apply(
                    [],
                    Object.values(props.messages)
                ).filter(contact =>
                    contact.content.indexOf(props.filter) !== -1 && contact.contentType !== 'text/pgp-public-key'
                )
            );
        } else {
            setFilteredMessages([]);
        }
    }, [props.filter, props.messages]);


    const getDisplayName = React.useCallback((uri) => {
        if (props.contactCache.has(uri)) {
            return {uri: uri, displayName: props.contactCache.get(uri)};
        }
        return {uri: uri};
    }, [props.contactCache]);

    const contacts = React.useMemo(() => {
        const OrderedKeys = [];
        let newItem = null;
        Object.keys(props.messages).filter(name => {
            let identity = getDisplayName(name);
            return (identity.displayName && identity.displayName.toLowerCase().indexOf(props.filter.toLowerCase()) !== -1)
                || name.indexOf(props.filter) !== -1
        }).forEach(key => {
            if (props.messages[key] && props.messages[key].length) {
                let lastItem = props.messages[key][props.messages[key].length - 1]
                if (lastItem.content.startsWith('?OTRv')) {
                    for (let i = 2; i <= props.messages[key].length; i++) {
                        lastItem = props.messages[key][props.messages[key].length - i]
                        if (lastItem.content.startsWith('?OTRv')) {
                            break;
                        }
                    }
                }
                OrderedKeys.push(Object.assign({message: lastItem}, getDisplayName(key)));
            } else {
                newItem = key;
            }
        });
        OrderedKeys.sort((a,b) => b.message.timestamp - a.message.timestamp);
        if (newItem !== null) {
            OrderedKeys.unshift({uri: newItem});
        }
        return OrderedKeys;
    }, [props.messages, props.filter, getDisplayName]);


    const statusIcon = (message) => {
        const state = message.state;
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

    const parseContent = (message) => {
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
                    component = "span"
                    classes = {{sizeSmall: classes.chipSmall, iconSmall: classes.iconSmall}}
                    variant = "outlined"
                    size  = "small"
                    icon  = {<LockIcon />}
                    label = "Public key"
                />
            );
        }
    };


    const getHighlightedText = (text, highlight) =>{
        // Split on highlight term and include term into parts, ignore case
        if (text === undefined) {
            return;
        }
        const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
        return (
            <span>
                {parts.map((part, i) =>
                    (
                        <span key={i} style={part.toLowerCase() === highlight.toLowerCase() ? { fontWeight: 'bold' } : {} }>
                            {part}
                        </span>
                    )
                )}
            </span>
        );
    }

    const switchChat = (uri, id) => {
        props.loadMessages(uri, id);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    return (<div className={classes.scrollable}>
        <List disablePadding>
            {props.filter && props.defaultDomain && Object.keys(props.messages).indexOf(props.filter) === -1 &&
                [
                    <ListItem key="new" style={{height: '66px'}}>
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
                    <ListSubheader className={classes.subheader}>Chats</ListSubheader>
                    <Divider component="li" key="divider" variant="inset"/>
                </React.Fragment>
            }
            <CustomContextMenu
                open = {Boolean(anchorEl)}
                anchorEl={anchorEl}
                onClose = {handleClose}
                keepMounted
            >
                <MenuItem className={classes.item} onClick={() => {props.removeChat(contactRef.current); handleClose()}}>
                    Remove Chat
                </MenuItem>
            </CustomContextMenu>
        {contacts.map(contact => (
            [
                <ListItem
                    className = {props.selectedUri === contact.uri ? classes.selected : classes.listItem}
                    alignItems = "flex-start"
                    key = {contact.uri}
                    onClick = {()=>switchChat(contact.uri)}
                    onContextMenu = {(e) => {
                        e.preventDefault();
                        contactRef.current = contact.uri;
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
                    }}
                    disableGutters
                >
                    <ListItemAvatar style={{minWidth: 60, marginTop:0}}>
                        <UserIcon identity={contact} active={false} chatContact={true}/>
                    </ListItemAvatar>
                    <ListItemText
                        secondaryTypographyProps={{className: classes.root}}
                        primary={
                            <React.Fragment>
                                <Grid container spacing={2} justify="space-between" alignItems="baseline">
                                    <Grid item>
                                        <Typography
                                            variant="h4"
                                            className={classes.header}
                                            style={{flexGrow: 1}}
                                        >
                                        {getHighlightedText(contact.displayName || contact.uri, props.filter)}
                                        </Typography>
                                    </Grid>
                                    <Grid item>
                                        <Typography className={classes.date}>
                                            {contact.message && statusIcon(contact.message)}
                                            {contact.message && formatTime(contact.message)}
                                        </Typography>
                                    </Grid>
                                </Grid>
                            </React.Fragment>
                        }
                        secondary = {contact.message && parseContent(contact.message)}
                    />
                </ListItem>,
                <Divider style={props.selectedUri === contact.uri ? {background: 'transparent'} : {}} component="li" key={`divider_${contact.uri}`}/>
            ]
        ))}
        {props.filter && filteredMessages.length !== 0 && 
            <React.Fragment>
                <ListSubheader className={classes.subheader}>Messages</ListSubheader>
                <Divider component="li" key="divider" />
                {filteredMessages.map(message => (
                    [
                        <ListItem
                            className = {classes.listItem} alignItems="flex-start"
                            key = {message.id}
                            onClick = {()=> {
                                let group = message.receiver;
                                if (message.state === 'received') {
                                    group = message.sender.uri;
                                }
                                switchChat(group, message.id)
                            }}
                            disableGutters
                        >
                            <ListItemText
                                secondaryTypographyProps = {{className: classes.root}}
                                primary = {
                                    <React.Fragment>
                                        <Grid container spacing={2} justify="space-between" alignItems="baseline">
                                            <Grid item>
                                                <Typography
                                                    variant = "h4"
                                                    className = {classes.header}
                                                    style = {{flexGrow: 1}}
                                                >
                                                    {message.state === 'received'
                                                        ? getDisplayName(message.sender.uri, props.contactCache).displayName
                                                        : (
                                                            getDisplayName(message.receiver, props.contactCache).displayName
                                                            || getDisplayName(message.receiver, props.contactCache).uri
                                                        )
                                                    }
                                                </Typography>
                                            </Grid>
                                            <Grid item>
                                                <Typography className={classes.date}>
                                                    {message && statusIcon(message)}
                                                    {message && formatTime(message)}
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </React.Fragment>
                                }
                                secondary = {message && getHighlightedText(parseContent(message), props.filter)}
                            />
                        </ListItem>,
                        <Divider component="li" key={`divider_${message.id}`}/>
                    ]
                ))}
            </React.Fragment>
        }
        </List>
    </div>);
}

ContactList.propTypes = {
    messages      : PropTypes.object.isRequired,
    contactCache  : PropTypes.object.isRequired,
    loadMessages  : PropTypes.func.isRequired,
    startChat     : PropTypes.func.isRequired,
    removeChat    : PropTypes.func.isRequired,
    defaultDomain : PropTypes.string.isRequired,
    filter        : PropTypes.string,
    selectedUri   : PropTypes.string
};


module.exports = ContactList;
