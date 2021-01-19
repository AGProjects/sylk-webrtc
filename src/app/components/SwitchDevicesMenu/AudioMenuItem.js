'use strict';

const React             = require('react');
const { useRef }        = React;
const PropTypes         = require('prop-types');
const { makeStyles }    = require('@material-ui/core/styles');
const { ListItemIcon }  = require('@material-ui/core');
const { default: clsx } = require('clsx');
const sylkrtc           = require('sylkrtc');

const VolumeBar = require('../VolumeBar')


const styleSheet = makeStyles((theme) => ({
    audioLabel: {
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        paddingLeft: '20px',
        flex: 3
    },
    audioLabelSelected: {
        paddingLeft: 0
    },
    icon: {
        minWidth: '20px'
    }
}));

const AudioMenuItem = (props) => {
    const classes = styleSheet();
    const volume = useRef();

    const failed = () => {
        return props.stream && props.stream === 'failed'
    }

    return (
        <React.Fragment>
            {props.selected &&
                <ListItemIcon className={classes.icon}>
                    <i className="fa fa-check-circle"></i>
                </ListItemIcon>
            }
            <div className={ clsx(classes.audioLabel, {[`${classes.audioLabelSelected}`]: props.selected})}>{props.label}</div>
            {props.stream && !failed() &&
                <div style={{flex:1}}><VolumeBar localMedia={props.stream} /></div>
            }
        </React.Fragment>
    );
}

AudioMenuItem.propTypes = {
    stream: PropTypes.any,
    selected: PropTypes.bool,
    label: PropTypes.string
};


module.exports = AudioMenuItem;
