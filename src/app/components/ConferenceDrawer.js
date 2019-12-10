'use strict';

const React     = require('react');
const PropTypes = require('prop-types');

const classNames    = require('classnames');
const Styles        = require('material-ui/styles');
const withStyles    = Styles.withStyles;
const Manipulator   = require('material-ui/styles/colorManipulator');
const Fade          = Manipulator.fade;

const Colors        = require('material-ui/colors');
const Grey          = Colors.grey;

const Mui           = require('material-ui');
const Drawer        = Mui.Drawer;
const Toolbar       = Mui.Toolbar;
const Typography    = Mui.Typography;
const Divider       = Mui.Divider;


const styleSheet = {
    paper: {
        width: 350,
        backgroundColor: Grey[100],
        borderLeft: '1px solid rgba(0, 0, 0, 0.12)',
        borderRight: 0
    },
    paperLeft: {
        width: 350,
        backgroundColor: Grey[100],
        borderLeft: 0,
        borderRight: '1px solid rgba(0, 0, 0, 0.12)'
    },
    paperLeftTransparent: {
        width: 350,
        backgroundColor: Fade(Grey[100], .90),
        borderLeft: 0,
        borderRight: '1px solid rgba(0, 0, 0, 0.12)'
    },
    paperLeftTransparentWide: {
        width: 450,
        backgroundColor: Fade(Grey[100], .90),
        borderLeft: 0,
        borderRight: '1px solid rgba(0, 0, 0, 0.12)'
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
};

const ConferenceDrawer = (props) => {
    const paperClass = classNames(
        {[`${props.classes.paper}`]: props.anchor !== 'left' && !props.transparent && !props.wide},
        {[`${props.classes.paperLeft}`]: props.anchor === 'left' && !props.transparent && !props.wide},
        {[`${props.classes.paperLeftTransparent}`]: props.anchor === 'left' && props.transparent && !props.wide},
        {[`${props.classes.paperLeftTransparentWide}`]: props.anchor === 'left' && props.transparent && props.wide}
    );

    const chevronIcon = classNames({
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
        <Typography className={props.classes.title} type="title" gutterBottom color="inherit" noWrap>
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
                <Toolbar className={props.classes.toolbar}>
                    {props.anchor !== 'left' ? closeButton : title }
                    <div className={props.classes.grow} />
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
    classes     : PropTypes.object.isRequired,
    show        : PropTypes.bool.isRequired,
    close       : PropTypes.func.isRequired,
    anchor      : PropTypes.string,
    transparent : PropTypes.bool,
    wide        : PropTypes.bool,
    title       : PropTypes.object,
    children    : PropTypes.node
};


module.exports = withStyles(styleSheet)(ConferenceDrawer);
