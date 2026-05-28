'use strict';

const React = require('react');
const { withStyles, makeStyles, alpha } = require('@material-ui/core/styles');
const { Button, Tab, Tabs, Tooltip } = require('@material-ui/core');
const { InputBase } = require('@material-ui/core');

const BootstrapButton = withStyles((theme) => ({
    root: {
        boxShadow: 'none',
        textTransform: 'none',
        fontSize: 14,
        fontFamily: 'inherit',
        fontWeight: 'normal',
        padding: '6px 12px',
        border: '1px solid transparent',
        lineHeight: 1.42857143,
        borderRadius: '4px'
    },
    contained: {
        backgroundColor: '#337ab7',
        borderColor: '#2e6da4',
        color: '#fff',
        '&:hover': {
            backgroundColor: '#286090',
            borderColor: '#204d74',
            boxShadow: 'none'
        },
        '&:active': {
            boxShadow: 'inset 0 3px 5px rgba(0, 0, 0, .125)',
            backgroundColor: '#286090',
            borderColor: '#204d74'
        },
        '&:focus': {
            borderColor: '#122b40',
            backgroundColor: '#204d74',
            outlineOffset: '-2px',
            boxShadow: 'inset 0px 3px 5px 0px rgba(0,0,0,.125)'
        }
    },
    containedSecondary: {
        color: '#fff',
        backgroundColor: '#d9534f',
        borderColor: '#d43f3a',

        '&:hover': {
            backgroundColor: '#c9302c',
            borderColor: '#ac2925'
        },
        '&:focus': {
            backgroundColor: '#c9302c',
            borderColor: '#761c19'
        }
    },
    outlined: {
        border: `1px solid ${theme.palette.type === 'light' ? 'rgba(0, 0, 0, 0.23)' : 'rgba(255, 255, 255, 0.23)'}`,
        '&$disabled': {
            border: `1px solid ${theme.palette.action.disabledBackground}`,
        },
    },
    outlinedPrimary: {
        color: theme.palette.primary.main,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
        '&:hover': {
            border: `1px solid ${theme.palette.primary.main}`,
            backgroundColor: alpha(theme.palette.primary.main, theme.palette.action.hoverOpacity),
            // Reset on touch devices, it doesn't add specificity
            '@media (hover: none)': {
                backgroundColor: 'transparent',
            },
        },
    },
    outlinedSecondary: {
        color: '#d9534f',
        border: `1px solid ${alpha('#d43f3a', 0.5)}`,
        '&:hover': {
            border: `1px solid ${theme.palette.secondary.main}`,
            backgroundColor: alpha('#d9534f', theme.palette.action.hoverOpacity),
            // Reset on touch devices, it doesn't add specificity
            '@media (hover: none)': {
                backgroundColor: 'transparent',
            },
        },
    },
    disabled: {
        border: '1px solid #fff',
        cursor: 'not-allowed'
    },
    sizeLarge: {
        padding: '10px 20px',
        fontSize: 18,
        fontWeight: 'bold',
        borderRadius: '6px',
        lineHeight: 1.33333
    },
    outlinedSizeLarge: {
        fontWeight: 'normal'
    },
    label: {
        display: 'block'
    },
    text: {
        borderColor: 'transparent',
        backgroundColor: 'transparent',
        color: '#337ab7',
        boxShadow: 'none'
    }
}))(Button);


const BootstrapInputBase = withStyles((theme) => ({
    root: {
        'label + &': {
            marginTop: theme.spacing(3)
        },
        fontFamily: 'inherit'
    },
    input: {
        borderRadius: 4,
        position: 'relative',
        backgroundColor: theme.palette.background.paper,
        border: '1px solid #ced4da',
        fontSize: 14,
        padding: '10px 26px 10px 12px',
        transition: theme.transitions.create(['border-color', 'box-shadow']),
        boxShadow: 'inset 0 1px 1px rgba(0, 0, 0, .075)',
        '&:focus': {
            borderRadius: 4,
            borderColor: '#66afe9',
            boxShadow: 'inset 0 1px 1px rgba(0,0,0,.075), 0 0 8px rgba(102, 175, 233, .6)'
        }
    }
}))(InputBase);


const BootstrapTabs = withStyles({
    root: {
        borderBottom: '1px solid rgba(0, 0, 0, .12)'
    },
    indicator: {
        backgroundColor: '#337ab7'
    }
})(Tabs);


const BootstrapTab = withStyles((theme) => ({
    root: {
        textTransform: 'none',
        fontWeight: theme.typography.fontWeightRegular,
        fontFamily: 'inherit',
        fontSize: '14px',
        '&:hover': {
            color: '#23527c',
            opacity: 1
        },
        '&$selected': {
            color: '#337ab7',
            fontWeight: theme.typography.fontWeightMedium
        },
        '&:focus': {
            color: '#337ab7'
        }
    },
    selected: {}
}))(Tab);


const useStylesBootstrap = makeStyles((theme) => ({
    arrow: {
        color: theme.palette.common.black
    },
    tooltip: {
        backgroundColor: theme.palette.common.black,
        fontSize: '12px',
        fontFamily: 'inherit'
    }
}));

function BootstrapTooltip(props) {
    const classes = useStylesBootstrap();

    return <Tooltip arrow classes={classes} {...props} />;
}

exports.Button = BootstrapButton;
exports.InputBase = BootstrapInputBase;
exports.Tab = BootstrapTab;
exports.Tabs = BootstrapTabs;
exports.Tooltip = BootstrapTooltip;
