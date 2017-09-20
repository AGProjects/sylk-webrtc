'use strict';

const React     = require('react');
const PropTypes = require('prop-types');
const utils     = require('../utils');

const Styles     = require('material-ui/styles');
const withStyles = Styles.withStyles;
const Mui        = require('material-ui');
const Avatar     = Mui.Avatar;


const styleSheet = {
    drawerAvatar: {
        fontFamily: 'Helvetica Neue ,Helvetica, Arial, sans-serif',
        textTransform: 'uppercase'
    }
};

const UserIcon = (props) => {
    const name = props.identity.displayName || props.identity.uri;
    const initials = name.split(' ', 2).map(x => x[0]).join('');
    const color = utils.generateMaterialColor(props.identity.uri)['300'];

    return (
        <Avatar className={props.classes.drawerAvatar} style={{backgroundColor: color}}>
            {initials}
        </Avatar>
    );
};

UserIcon.propTypes = {
    classes: PropTypes.object.isRequired,
    identity: PropTypes.object.isRequired
};


module.exports = withStyles(styleSheet)(UserIcon);
