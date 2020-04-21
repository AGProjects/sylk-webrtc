'use strict';

const React     = require('react');
const PropTypes = require('prop-types');
const utils     = require('../utils');

const { makeStyles }    = require('@material-ui/core/styles');
const { Avatar }        = require('@material-ui/core');

const classNames = require('classnames');


const styleSheet = makeStyles({
    root: {
        transition: 'box-shadow 0.3s'
    },
    drawerAvatar: {
        fontFamily: 'Helvetica Neue ,Helvetica, Arial, sans-serif',
        textTransform: 'uppercase'
    },
    card: {
        width: '70px',
        height: '70px',
        fontSize: '2.5rem',
        margin: '10px'
    },
    large: {
        width: '144px',
        height: '144px',
        fontSize: '5rem',
        margin: 'auto'
    },
    shadow: {
        boxShadow: '0 0 10px 2px #999'
    }
});

const UserIcon = (props) => {
    const classes = styleSheet();
    const name = props.identity.displayName || props.identity.uri;
    let initials = name.split(' ', 2).map(x => x[0]).join('');
    const color = utils.generateMaterialColor(props.identity.uri)['300'];
    const avatarClasses = classNames(
        classes.root,
        classes.drawerAvatar,
        {[`${classes.card}`]: props.card},
        {[`${classes.large}`]: props.large},
        {[`${classes.shadow}`]: props.active}
    );

    if (props.identity.uri === 'anonymous@anonymous.invalid') {
        initials = <i className="fa fa-user fa-2x fa-fw"></i>;
    }

    return (
        <Avatar className={avatarClasses} style={{backgroundColor: color}}>
            {initials}
        </Avatar>
    );
};

UserIcon.propTypes = {
    identity: PropTypes.object.isRequired,
    large: PropTypes.bool,
    card: PropTypes.bool,
    active: PropTypes.bool
};


module.exports = UserIcon;
