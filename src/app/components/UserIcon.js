'use strict';

const React     = require('react');
const PropTypes = require('prop-types');
const utils     = require('../utils');

const { makeStyles }    = require('@material-ui/core/styles');
const { Avatar }        = require('@material-ui/core');
const { AddAPhoto: AddAPhotoIcon } = require('@material-ui/icons');

const { default: clsx } = require('clsx');

const { useAddressbook } = require('../AddressbookProvider');

const styleSheet = makeStyles({
    root: {
        transition: 'box-shadow 0.15s ease-out'
    },
    drawerAvatar: {
        fontFamily: 'Helvetica Neue ,Helvetica, Arial, sans-serif',
        textTransform: 'uppercase'
    },
    margin: {
        margin: '5px'
    },
    card: {
        width: '70px',
        height: '70px',
        fontSize: '2.5rem',
        margin: '10px'
    },
    chatContact: {
        width: '50px',
        height: '50px',
        fontSize: '1.5625rem',
        margin: 0
    },
    carousel: {
        width: '80px',
        height: '80px',
        fontSize: '2.85rem',
        margin: 'auto'
    },
    large: {
        width: '144px',
        height: '144px',
        fontSize: '5rem',
        margin: 'auto'
    },
    shadow: {
        boxShadow: '0 0 2px 2px #999'
    },
    shadowSmall: {
        boxShadow: '0 0 5px 2px #999'
    },
    editable: {
        cursor: 'pointer'
    },
    '@keyframes speakingPulse': {
        '0%': {
            boxShadow: '0 0 0 0 rgba(var(--avatar-color), 0.7), 0 0 0 3px rgba(0, 0, 0, 0.25)'
        },
        '70%': {
            boxShadow: '0 0 0 24px rgba(var(--avatar-color), 0), 0 0 0 3px rgba(0, 0, 0, 0.25)'
        },
        '100%': {
            boxShadow: '0 0 0 0 rgba(var(--avatar-color), 0), 0 0 0 3px rgba(0, 0, 0, 0.25)'
        }
    },
    speaking: {
        animation: '$speakingPulse 1.4s ease-out infinite'
    },
    speakingSmall: {
        animation: '$speakingPulse 1.4s ease-out infinite'
    }
});

function hexToRgbString(hex) {
      const clean = hex.replace('#', '');
      const r = parseInt(clean.substring(0, 2), 16);
      const g = parseInt(clean.substring(2, 4), 16);
      const b = parseInt(clean.substring(4, 6), 16);
      return `${r}, ${g}, ${b}`;
}

const UserIcon = (props) => {
    const classes = styleSheet();
    const ab = useAddressbook();
    const identity = props.contact?.identity || props.identity;
    if (!identity) return null;
    const name = identity.displayName || identity.uri;
    let initials = name.split(' ', 2).map(x => x[0]).join('');
    const color = utils.generateMaterialColor(identity.uri)['300'];
    const avatarClasses = clsx(
        classes.root,
        classes.drawerAvatar,
        {[`${classes.card}`]: props.card},
        {[`${classes.chatContact}`]: props.chatContact},
        {[`${classes.large}`]: props.large},
        {[`${classes.speaking}`]: props.active},
        {[`${classes.shadowSmall}`]: props.active && props.small},
        {[`${classes.carousel}`]: props.carousel},
        {[`${classes.editable}`]: !!props.onEdit},
        {[`${classes.margin}`]: props.small}
    );

    if (identity.uri === 'anonymous@anonymous.invalid') {
        initials = <i className="fa fa-user fa-2x fa-fw"></i>;
    }

    if (props.isConference) {
        if (props.card) {
            initials = <i className="fa fa-users fa-fw"></i>;
        } else {
            initials = <i className="fa fa-users fa-2x fa-fw"></i>;
        }
    }

    if (props.onEdit && !props.contact?.avatarUri) {
        initials = <AddAPhotoIcon fontSize="inherit" />;
    }
    let avatarUri = props.contact?.avatarUri;

    if (!props.contact && props.lookup !== false) {
        avatarUri = ab?.addressbook.contacts.best(identity.uri)?.avatarUri;
    }

    return (
        <Avatar className={avatarClasses} src={avatarUri} style={{backgroundColor: color, '--avatar-color': hexToRgbString(color)}} onClick={props.onEdit}>
            {initials}
        </Avatar>
    );
};

const identityCheck = (props, propName, componentName) => {
    if (props.identity && typeof props.identity !== 'object') {
        return new Error(`${componentName}: "identity" must be an object.`);
    }
    if (!props.identity && !(props.contact && props.contact.identity)) {
        return new Error(`${componentName}: pass "identity", or a "contact" that has an "identity".`);
    }
    return null;
};

UserIcon.propTypes = {
    contact: PropTypes.object,
    identity: identityCheck,
    large: PropTypes.bool,
    card: PropTypes.bool,
    carousel: PropTypes.bool,
    small: PropTypes.bool,
    active: PropTypes.bool,
    chatContact: PropTypes.bool,
    isConference: PropTypes.bool,
    onEdit: PropTypes.func,
    lookup: PropTypes.bool
};


module.exports = UserIcon;
