'use strict';

const React         = require('react');
const PropTypes     = require('prop-types');

const Mui           = require('material-ui');
const Badge         = Mui.Badge;
const Styles        = require('material-ui/styles');
const withStyles    = Styles.withStyles;


const styleSheet = {
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
        marginLeft: '-10px'
    },
    rootThumb: {
        display: 'block',
        bottom: '25px',
        position: 'absolute',
        zIndex: 3
    }
};

const HandIcon = (props) => {
    let content = null;

    let badgeClass = props.classes.badge;
    if (props.drawer) {
        badgeClass = props.classes.badgeDrawer;
    }
    let rootClass;
    if (props.thumb) {
        rootClass = props.classes.rootThumb;
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
    classes             : PropTypes.object.isRequired,
    disableHandToggle   : PropTypes.bool,
    drawer              : PropTypes.bool,
    thumb               : PropTypes.bool
};


module.exports = withStyles(styleSheet)(HandIcon);
