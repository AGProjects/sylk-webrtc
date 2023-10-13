'use strict';

const React         = require('react');
const PropTypes     = require('prop-types');
const { default: clsx } = require('clsx');
const { DateTime, Duration } = require('luxon');

const { makeStyles } = require('@material-ui/core/styles');
const { Card, CardActions, CardContent } = require('@material-ui/core');
const { Typography, IconButton: Button } = require('@material-ui/core');
const UserIcon      = require('./UserIcon');


const styles = makeStyles({
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
    },
    mainHeading: {
        color: props => props.historyItem.direction === 'received' && props.historyItem.duration === 0 ? '#a94442' : 'inherit'
    }
});

const HistoryCard = (props) => {
    const classes =  styles(props);
    const identity = {
        displayName: props.historyItem.displayName,
        uri: props.historyItem.remoteParty || props.historyItem
    }

    const directionIcon = clsx({
        'fa'                    : true,
        'rotate-minus-45'       : true,
        'fa-long-arrow-left'    : props.historyItem.direction === 'received',
        'fa-long-arrow-right'   : props.historyItem.direction === 'placed'
    });

    const startVideoCall = (e) => {
        e.stopPropagation();
        if (props.noConnection === false) {
            props.setTargetUri(identity.uri);
            // We need to wait for targetURI
            setImmediate(() => {
                props.startVideoCall(e);
            });
        }
    }

    const startAudioCall = (e) => {
        e.stopPropagation();
        props.setTargetUri(identity.uri);
        // We need to wait for targetURI
        setImmediate(() => {
            props.startAudioCall(e);
        });
    }

    const startChat = (e) => {
        e.stopPropagation();
        props.setTargetUri(identity.uri);
        // We need to wait for targetURI
        setImmediate(() => {
            props.startChat(e);
        });
    }

    let duration = Duration.fromObject({seconds: props.historyItem.duration}).toFormat('hh:mm:ss');
    if (props.historyItem.direction === 'received' && props.historyItem.duration === 0) {
        duration = 'missed';
    }

    const name = identity.displayName || identity.uri;

    const date = DateTime.fromFormat(
        `${props.historyItem.startTime} ${props.historyItem.timezone}`,
        "yyyy-MM-dd' 'HH:mm:ss z"
    ).toFormat('yyyy MM dd HH:mm:ss');

    return (
        <Card
            className={classes.card}
            onClick={() => {props.setTargetUri(identity.uri)}}
            onDoubleClick={startVideoCall}
        >
            <div className={classes.column}>
            <CardContent className={classes.content}>
                <Typography noWrap className={classes.mainHeading} variant="h5">{name} ({duration})</Typography>
                <Typography className={classes.biggerFont} variant="subtitle1" color="textSecondary">
                    <strong><i className={directionIcon}></i></strong>&nbsp;{date}
                </Typography>
            </CardContent>
            <CardActions className={classes.actions}>
                <Button classes={{root: classes.iconSmall}} disabled={props.noConnection} onClick={startAudioCall} title={`Audio call to ${name}`}>
                    <i className="fa fa-phone"></i>
                </Button>
                <Button classes={{root: classes.iconSmall}} disabled={props.noConnection} onClick={startVideoCall} title={`Video call to ${name}`}>
                    <i className="fa fa-video-camera"></i>
                </Button>
                <Button classes={{root: classes.iconSmall}} onClick={startChat} title={`Chat to ${name}`}>
                    <i className="fa fa-comments"></i>
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
    historyItem    : PropTypes.object,
    startAudioCall : PropTypes.func.isRequired,
    startVideoCall : PropTypes.func.isRequired,
    startChat      : PropTypes.func.isRequired,
    setTargetUri   : PropTypes.func.isRequired,
    noConnection   : PropTypes.bool
};


module.exports =  HistoryCard;
