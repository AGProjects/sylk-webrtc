'use strict';

const React     = require('react');
const PropTypes = require('prop-types');

const Styles        = require('material-ui/styles');
const withStyles    = Styles.withStyles;

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
    return (
        <Drawer
            anchor="right"
            classes={{
                paper: props.classes.paper
            }}
            type="persistent"
            open={props.show}
            SlideProps={{ unmountOnExit: true }}
            onRequestClose={props.close}
        >
            <div className="conference-drawer">
                <Toolbar className={props.classes.toolbar}>
                    <button type="button" className="close" onClick={props.close}>
                        <span aria-hidden="true">
                            <i className="fa fa-chevron-right"></i>
                        </span>
                        <span className="sr-only">Close</span>
                    </button>
                    <div className={props.classes.grow} />
                    <Typography className={props.classes.title} type="title" gutterBottom color="inherit" noWrap>
                        {props.title}
                    </Typography>
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
    title       : PropTypes.object,
    children    : PropTypes.node
};


module.exports = withStyles(styleSheet)(ConferenceDrawer);
