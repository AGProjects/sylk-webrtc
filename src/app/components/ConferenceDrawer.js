'use strict';

const React     = require('react');
const PropTypes = require('prop-types');

const { default: clsx }     = require('clsx');
const { makeStyles, fade }  = require('@material-ui/core/styles');
const { grey }              = require('@material-ui/core/colors');
const { Drawer, Toolbar, Typography, Divider } = require('@material-ui/core');


const styleSheet = makeStyles({
    paper: {
        width: 350,
        backgroundColor: grey[100],
        borderRight: 0
    },
    paperLeft: {
        width: 350,
        backgroundColor: grey[100],
        borderLeft: 0
    },
    paperLeftTransparent: {
        width: 350,
        backgroundColor: fade(grey[100], .85),
        borderLeft: 0
    },
    paperLeftTransparentWide: {
        width: 450,
        backgroundColor: fade(grey[100], .85),
        borderLeft: 0
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
});

const ConferenceDrawer = (props) => {
    const classes = styleSheet();
    const paperClass = clsx(
        {[`${classes.paper}`]: props.anchor !== 'left' && !props.transparent && !props.wide},
        {[`${classes.paperLeft}`]: props.anchor === 'left' && !props.transparent && !props.wide},
        {[`${classes.paperLeftTransparent}`]: props.anchor === 'left' && props.transparent && !props.wide},
        {[`${classes.paperLeftTransparentWide}`]: props.anchor === 'left' && props.transparent && props.wide}
    );

    const chevronIcon = clsx({
        'fa'                : true,
        'fa-chevron-right'  : props.anchor !== 'left',
        'fa-chevron-left'   : props.anchor === 'left'
    });

    const closeButton = (
        <button type="button" className="close" onClick={props.close}>
            <span aria-hidden="true">
                <i className={chevronIcon}></i>
            </span>
            <span className="sr-only">Close</span>
        </button>
    );

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
                    {props.anchor !== 'left' ? closeButton : title }
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
    show        : PropTypes.bool.isRequired,
    close       : PropTypes.func.isRequired,
    anchor      : PropTypes.string,
    transparent : PropTypes.bool,
    wide        : PropTypes.bool,
    title       : PropTypes.object,
    children    : PropTypes.node
};


module.exports = ConferenceDrawer;
