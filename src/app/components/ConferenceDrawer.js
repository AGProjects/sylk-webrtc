'use strict';

const React = require('react');
const PropTypes = require('prop-types');

const { default: clsx } = require('clsx');
const { makeStyles, alpha } = require('@material-ui/core/styles');
const { grey } = require('@material-ui/core/colors');
const { Drawer, Toolbar, Typography, Divider } = require('@material-ui/core');


const styleSheet = makeStyles(theme => {
    return {
        // Anchors
        paper: {
            borderRight: 0
        },
        paperLeft: {
            borderLeft: 0
        },
        // Sizes
        paperSmall: {
            width: 55,
            '& .drawer-body': {
                padding: '0 !important'
            }
        },
        paperNormal: {
            width: 350
        },

        paperNormalWide: {
            width: 400
        },

        paperWide: {
            width: 450
        },
        paperFullWidth: {
            width: '100%'
        },
        // Transparent or not
        paperNotTransparent: {
            backgroundColor: grey[100]
        },
        paperTransparent: {
            backgroundColor: alpha(grey[100], .85)
        },
        // Utils
        paperAdjustedForRightDrawer: {
            width: 'calc(100% - 405px)',
            borderRight: 0
        },
        paperAdjustedForSmallLeftDrawer: {
            marginLeft: 55
        },
        paperAdjustedForSmallLeftDrawerFull: {
            width: 'calc(100% - 55px)'
        },

        paperAdjustedForLeftDrawer: {
            marginLeft: 400
        },

        paperAdjustedForLeftDrawerFull: {
            width: 'calc(100% - 400px)'
        },

        paperOnTop: {
            zIndex: 1501
        },
        [theme.breakpoints.down('sm')]: {
            paperNormalWide: {
                width: '100%'
            },
            paperAdjustedForLeftDrawer: {
                margin: 0
            },
            paperAdjustedForLeftDrawerFull: {
                width: '100%'
            }
        },
        title: {
            flex: '0 1 auto'
        },
        grow: {
            flex: '1 1 auto'
        },
        toolbar: {
            minHeight: '50px',
            height: 50
        }
    }
});

const ConferenceDrawer = (props) => {
    const classes = styleSheet();
    const paperClass = clsx(
        { [`${classes.paper}`]: props.anchor !== 'left' },
        { [`${classes.paperLeft}`]: props.anchor === 'left' },
        { [`${classes.paperTransparent}`]: props.transparent },
        { [`${classes.paperNotTransparent}`]: !props.transparent && !props.noBackgroundColor },
        { [`${classes.paperSmall}`]: props.size === 'small' },
        { [`${classes.paperNormal}`]: props.size === 'normal' || !props.size },
        { [`${classes.paperWide}`]: props.size === 'wide' },
        { [`${classes.paperNormalWide}`]: props.size === 'normalWide' },
        { [`${classes.paperFullWidth}`]: props.size === 'full' },
        { [`${classes.paperAdjustedForSmallLeftDrawer}`]: props.anchor === 'left' && (props.position === 'middle' || props.position === 'right') },
        { [`${classes.paperAdjustedForSmallLeftDrawerFull}`]: props.anchor === 'left' && props.size === 'full' && props.position === 'right' },
        { [`${classes.paperAdjustedForRightDrawer}`]: props.anchor === 'left' && props.position === 'middle' },
        { [`${classes.paperAdjustedForLeftDrawer}`]: props.anchor === 'right' && props.position === 'full' },
        { [`${classes.paperAdjustedForLeftDrawerFull}`]: props.anchor === 'right' && props.size === 'full' && props.position === 'full' },
        { [`${classes.paperOnTop}`]: props.onTop }
    );

    const chevronIcon = clsx({
        'fa': true,
        'fa-chevron-right': props.anchor !== 'left',
        'fa-chevron-left': props.anchor === 'left'
    });

    let closeButton;
    if (props.showClose !== false) {
        closeButton = (
            <button type="button" className="close" onClick={props.close}>
                <span aria-hidden="true">
                    <i className={chevronIcon}></i>
                </span>
                <span className="sr-only">Close</span>
            </button>
        );
    }
    const title = (
        <Typography className={classes.title} type="title" gutterBottom color="inherit" noWrap>
            {props.title}
        </Typography>
    );

    return (
        <Drawer
            anchor={props.anchor === 'left' ? 'left' : 'right'}
            classes={{
                paper: paperClass
            }}
            variant="persistent"
            open={props.show}
            SlideProps={{ unmountOnExit: true }}
            onClose={props.close}
        >
            <div className="conference-drawer">
                <Toolbar className={classes.toolbar}>
                    {props.anchor !== 'left' ? closeButton : title}
                    <div className={classes.grow} />
                    {props.anchor !== 'left' ? title : closeButton}
                    <Divider absolute />
                </Toolbar>
                <div className="drawer-body">
                    {props.children}
                </div>
            </div>
        </Drawer>
    );
}

ConferenceDrawer.propTypes = {
    show: PropTypes.bool.isRequired,
    close: PropTypes.func.isRequired,
    anchor: PropTypes.string,
    transparent: PropTypes.bool,
    size: PropTypes.string,
    position: PropTypes.string,
    showClose: PropTypes.bool,
    title: PropTypes.object,
    children: PropTypes.node,
    noBackgroundColor: PropTypes.bool,
    onTop: PropTypes.bool
};


module.exports = ConferenceDrawer;
