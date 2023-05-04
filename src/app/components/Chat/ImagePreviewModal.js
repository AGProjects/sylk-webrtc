'use strict';

const React = require('react');
const useState = React.useState;
const PropTypes = require('prop-types');

const { makeStyles, withStyles } = require('@material-ui/core/styles');
const {
    Dialog,
    DialogTitle,
    DialogContent,
    ImageListItemBar,
    Menu,
    Divider,
    MenuItem,
    IconButton
} = require('@material-ui/core');
const { Close, GetApp, MoreHoriz } = require('@material-ui/icons');

const UserIcon = require('../UserIcon');
const { Tooltip } = require('../../MaterialUIAsBootstrap')


function isElectron() {
    if (typeof window.process !== 'undefined') {
        if (window.process.versions.electron !== '' && window.process.platform === 'darwin') {
            return true;
        }
    }
    return false;
}

const ImageItemBar = withStyles((theme) => ({
    root: {
        fontFamily: 'inherit',
        textAlign: 'left'
    },
    positionTop: {
        background: 'linear-gradient(rgba(29,28,29,.6), rgba(29,28,29,0))'
    },
    positionBottom: {
        background: 'linear-gradient(rgba(29,28,29,0), rgba(29,28,29,0.6))'
    },
    title: {
        fontFamily: 'inherit',
        fontSize: '16px',
        display: 'flex',
        fontWeight: 600
    },
    titleWrap: {
        marginTop: '0px'
    },
    subtitle: {
        fontFamily: 'inherit',
        fontSize: '12px',
        display: 'flex'
    },
    actionIconActionPosLeft: {
        marginLeft: '16px',
        marginRight: '5px'
    }
}))(ImageListItemBar);


const styleSheet = makeStyles((theme) => ({
    fixFont: {
        fontFamily: 'inherit',
        fontSize: '16px'
    },
    iconSize: {
        fontSize: '24px'
    },
    paper: {
        overflow: 'hidden',
        height: 'calc(100% - 64px)',
        background: 'transparent'
    },
    fixHeader: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0
    },
    closeButton: {
        position: 'absolute',
        right: theme.spacing(1),
        top: theme.spacing(1),
        color: theme.palette.grey[500]
    },
    item: {
        fontSize: '14px',
        fontFamily: 'inherit',
        color: '#333',
        minHeight: 0
    },
    itemRed: {
        fontSize: '14px',
        fontFamily: 'inherit',
        color: 'rgb(169, 68, 66)',
        minHeight: 0
    },
    bottomButton: {
        color: theme.palette.grey[500]
    },
    image: {
        objectFit: 'contain',
        minWidth: '100%',
        maxWidth: '100%',
        minHeight: '100%',
        maxHeight: '100%'
    },
    relativeContainer: {
        display: 'flex',
        position: 'relative',
        width: '100%',
        height: '100%',
        justifyContent: 'center'
    },
    backgroundImage: {
        position: 'absolute',
        filter: 'blur(40px) brightness(0.4)',
        top: -100,
        bottom: -100,
        left: -100,
        right: -100
    }
}));

const ImagePreviewModal = (props) => {
    const classes = styleSheet();
    const [showLayers, setShowLayers] = useState(false);
    const [anchorEl, setAnchorEl] = React.useState(null);

    const parsedJsonContent = () => {
        try {
            return JSON.parse(props.message.content);
        }
        catch (e) {
            return {}
        }
    };

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const getDisplayName = (uri) => {
        if (props.contactCache !== undefined && props.contactCache.has(uri)) {
            return { uri: uri, displayName: props.contactCache.get(uri) };
        }
        return { uri: uri };
    };

    const sender = props.message.sender ? props.message.sender.displayName || props.message.sender.uri : '';

    const userIcon = () => {
        if (props.message && props.message.sender) {
            return <UserIcon identity={getDisplayName(props.message.sender.uri)} />
        }
        return ''
    }

    const getTitle = () => {
        return (
            <React.Fragment>
                {props.message && props.message.sender &&
                    getDisplayName(props.message.sender.uri).displayName || sender}
            </React.Fragment >
        )
    }

    return (
        <Dialog
            open={props.show}
            onClose={props.close}
            maxWidth="xl"
            fullWidth={true}
            aria-labelledby="dialog-titile"
            aria-describedby="dialog-description"
            disableEscapeKeyDown
            classes={{ 'paper': classes.paper }}
        >
            <DialogContent onMouseEnter={() => setShowLayers(true)} onMouseLeave={() => setShowLayers(false)} className={classes.fixFont} style={{ padding: 0 }}>
                <div className={classes.backgroundImage} style={{ background: `url("${props.image}") black 50%/cover` }}></div>
                <div className={classes.relativeContainer}>
                    <img className={classes.image} src={props.image} />
                    <div style={{ visibility: `${showLayers ? 'visible' : 'hidden'}` }}>
                        <ImageItemBar
                            title={getTitle()}
                            subtitle={props.message.filename}
                            position="top"
                            actionIcon={userIcon()}
                            actionPosition="left"
                        />
                        <DialogTitle id="dialog-title" className={classes.fixHeader} >
                            <IconButton aria-label="close" className={classes.closeButton} onClick={props.close}>
                                <Close classes={{ root: classes.iconSize }} />
                            </IconButton>
                        </DialogTitle>
                        <ImageItemBar title=""
                            position="bottom"
                            actionIcon={
                                <React.Fragment>
                                    <Tooltip title="Download">
                                        <IconButton aria-label="close" className={classes.bottomButton} onClick={() => { props.download(parsedJsonContent()); props.close }}>
                                            <GetApp classes={{ root: classes.iconSize }} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="More actions">
                                        <IconButton aria-label="close" className={classes.bottomButton} onClick={handleClick}>
                                            <MoreHoriz classes={{ root: classes.iconSize }} />
                                        </IconButton>
                                    </Tooltip>
                                    <Menu
                                        id="simple-menu"
                                        anchorEl={anchorEl}
                                        keepMounted
                                        open={Boolean(anchorEl)}
                                        onClose={handleClose}
                                        getContentAnchorEl={null}
                                        anchorOrigin={{
                                            vertical: 'top',
                                            horizontal: 'right'
                                        }}
                                        transformOrigin={{
                                            vertical: 'bottom',
                                            horizontal: 'right'
                                        }}
                                    >
                                        {!isElectron() &&
                                            <MenuItem className={classes.item} onClick={() => { props.openInNewTab(parsedJsonContent()); handleClose() }}>
                                                Open in new tab
                                            </MenuItem>
                                        }
                                        {!props.message.isSecure &&
                                            <MenuItem className={classes.item} onClick={() => { handleClose(); }}>
                                                Copy link to file
                                            </MenuItem>
                                        }
                                        <Divider />
                                        <MenuItem className={classes.itemRed} onClick={() => { props.removeMessage(props.message); handleClose(); props.close() }}>
                                            Delete file
                                        </MenuItem>
                                    </Menu>
                                </React.Fragment>
                            }
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog >
    );
}

ImagePreviewModal.propTypes = {
    show: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired,
    image: PropTypes.string,
    message: PropTypes.object,
    openInNewTab: PropTypes.func.isRequired,
    removeMessage: PropTypes.func.isRequired,
    download: PropTypes.func.isRequired,
    contactCache: PropTypes.object
};


module.exports = ImagePreviewModal;
