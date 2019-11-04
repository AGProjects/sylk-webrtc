'use strict';

const React         = require('react');
const PropTypes     = require('prop-types');
const classNames    = require('classnames');
const moment        = require('moment');
const momentFormat  = require('moment-duration-format');

const Styles        = require('material-ui/styles');
const withStyles    = Styles.withStyles;

const Mui           = require('material-ui');
const Card          = Mui.Card;
const CardActions   = Mui.CardActions
const CardContent   = Mui.CardContent;
const Typography    = Mui.Typography;
const Button        = Mui.IconButton;

const UserIcon      = require('./UserIcon');


const styleSheet = {
    card: {
        display: 'flex'
    },
    content: {
        flex: '1 0 auto',
        textAlign: 'left',
        maxWidth: 'calc( 100vw - 132px )',
        paddingBottom: 0
    },
    icon: {
        margin: 'auto'   
    },
    column: {
        display: 'flex',
        flex: '1 1 auto',
        flexDirection: 'column',
        minWidth: 0
    },
    biggerFont: {
        fontSize: '1.1rem'
    },
    actions: {
        paddingTop: 4
    },
    iconSmall: {
        width: 40,
        height: 40,
        color: '#337ab7'
    }
};
const HistoryCard = (props) => {
    const classes = props.classes;
    const identity = {
        displayName: props.historyItem.displayName,
        uri: props.historyItem.remoteParty || props.historyItem
    }

    const directionIcon = classNames({
        'fa'                    : true,
        'rotate-minus-45'       : true,
        'fa-long-arrow-left'    : props.historyItem.direction === 'received',
        'fa-long-arrow-right'   : props.historyItem.direction === 'placed'
    });

    const startVideoCall = (e) => {
        e.stopPropagation();
        props.setTargetUri(identity.uri);
        // We need to wait for targetURI
        setImmediate(() => {
            props.startVideoCall(e);
        });
    }

    const startAudioCall = (e) => {
        e.stopPropagation();
        props.setTargetUri(identity.uri);
        // We need to wait for targetURI
        setImmediate(() => {
            props.startAudioCall(e);
        });
    }

    let duration = moment.duration(props.historyItem.duration, 'seconds').format('hh:mm:ss', {trim: false});
    let color = {};
    if (props.historyItem.direction === 'received' && props.historyItem.duration === 0) {
        color.color = '#a94442';
        duration = 'missed';
    }

    const name = identity.displayName || identity.uri;

    return (
        <Card 
            className={classes.card}
            onClick={() => {props.setTargetUri(identity.uri)}} 
            onDoubleClick={startVideoCall}
        >
            <div className={classes.column}>
            <CardContent className={classes.content}>
                <Typography noWrap variant="headline" style={color}>{name} ({duration})</Typography>
                <Typography className={classes.biggerFont} variant="subheading" color="textSecondary">
                    <strong><i className={directionIcon}></i></strong>&nbsp;{props.historyItem.startTime}
                </Typography>
            </CardContent>
            <CardActions className={classes.actions}>
                <Button className={classes.iconSmall} onClick={startAudioCall} title={`Audio call to ${name}`}>
                    <i className="fa fa-phone"></i>
                </Button>
                <Button className={classes.iconSmall} onClick={startVideoCall} title={`Video call to ${name}`}>
                    <i className="fa fa-video-camera"></i>
                </Button>
            </CardActions>
            </div>
            <div className={classes.icon}>
                <UserIcon identity={identity} card/>
            </div>
        </Card>
    );
}

HistoryCard.propTypes = {
    classes        : PropTypes.object.isRequired,
    historyItem    : PropTypes.object,
    startAudioCall : PropTypes.func.isRequired,
    startVideoCall : PropTypes.func.isRequired,
    setTargetUri   : PropTypes.func.isRequired
};


module.exports =  withStyles(styleSheet)(HistoryCard);
