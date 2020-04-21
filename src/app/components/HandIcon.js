'use strict';

const React         = require('react');
const PropTypes     = require('prop-types');

const { makeStyles }    = require('@material-ui/core/styles');
const { Badge }         = require('@material-ui/core');


const styleSheet = makeStyles({
    badge: {
        width: '20px',
        height: '20px',
        fontWeight: 'bold',
        fontSize: '1rem',
        backgroundColor: '#337ab7'
    },
    badgeDrawer: {
        width: '20px',
        height: '20px',
        fontWeight: 'bold',
        fontSize: '1rem',
        backgroundColor: '#337ab7',
        position: 'unset',
        marginLeft: '-10px',
        transform: 'none'
    },
    rootThumb: {
        display: 'block',
        bottom: '25px',
        position: 'absolute',
        zIndex: 3
    }
});

const HandIcon = (props) => {
    let content = null;
    const classes = styleSheet();
    let badgeClass = classes.badge;
    if (props.drawer) {
        badgeClass = classes.badgeDrawer;
    }
    let rootClass;
    if (props.thumb) {
        rootClass = classes.rootThumb;
    }
    if (props.raisedHand !== -1) {
        let button = (
            <button key="handButton" type="button" title="Accept speaker request" className="btn btn-link btn-hand" onClick={props.handleHandSelected}>
                <i className="fa fa-hand-o-up" />
            </button>
        );
        if (props.disableHandToggle) {
            button = (<span style={{padding: '0 13px'}}><i className="fa fa-hand-o-up" /></span>);
        }
        content = (
            <Badge badgeContent={props.raisedHand + 1} color="primary" classes={{badge: badgeClass, root: rootClass}}>
                {button}
            </Badge>
        );
    }
    return (content);
}

HandIcon.propTypes = {
    raisedHand          : PropTypes.number.isRequired,
    handleHandSelected  : PropTypes.func.isRequired,
    disableHandToggle   : PropTypes.bool,
    drawer              : PropTypes.bool,
    thumb               : PropTypes.bool
};


module.exports = HandIcon;
