'use strict';

const React     = require('react');
const PropTypes = require('prop-types');
const utils     = require('../utils');

const Styles     = require('material-ui/styles');
const withStyles = Styles.withStyles;
const Mui        = require('material-ui');
const Avatar     = Mui.Avatar;

const classNames = require('classnames');

const styleSheet = {
    root: {
        transition: 'box-shadow 0.3s'
    },
    drawerAvatar: {
        fontFamily: 'Helvetica Neue ,Helvetica, Arial, sans-serif',
        textTransform: 'uppercase'
    },
    large: {
        width: '144px',
        height: '144px',
        fontSize: '5rem',
        margin: 'auto'
    },
    shadow: {
        boxShadow: '0 0 10px 2px #999',
    }
};

const UserIcon = (props) => {
    const name = props.identity.displayName || props.identity.uri;
    let initials = name.split(' ', 2).map(x => x[0]).join('');
    const color = utils.generateMaterialColor(props.identity.uri)['300'];
    const classes = classNames(
        props.classes.root,
        props.classes.drawerAvatar,
        {[`${props.classes.large}`]: props.large},
        {[`${props.classes.shadow}`]: props.active}
    );

    if (props.identity.uri === 'anonymous@anonymous.invalid') {
        initials = <i className="fa fa-user fa-2x fa-fw"></i>;
    }

    return (
        <Avatar className={classes} style={{backgroundColor: color}}>
            {initials}
        </Avatar>
    );
};

UserIcon.propTypes = {
    classes: PropTypes.object.isRequired,
    identity: PropTypes.object.isRequired,
    large: PropTypes.bool,
    active: PropTypes.bool
};


module.exports = withStyles(styleSheet)(UserIcon);
