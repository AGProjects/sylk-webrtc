'use strict';

const React = require('react');
const PropTypes = require('prop-types');

const { useInView } = require('react-intersection-observer');

const { makeStyles } = require('@material-ui/core/styles');


const styleSheet = makeStyles((theme) => ({
    sticky: {
        position: 'sticky',
        top: '-1px',
        backgroundColor: 'rgba(230, 230, 230, .85)',
        zIndex: 1
    }
}));

const ListWithStickyHeader = ({ children, header }) => {
    const classes = styleSheet();

    const { ref, inView } = useInView({
        threshold: 0
    });

    const { ref: ref2, inView: inView2 } = useInView({
        threshold: [1]
    });

    return (
        <React.Fragment>
            <div ref={ref2} className={inView && !inView2 ? classes.sticky : ''}>{header}</div>
            <div ref={ref}>{...children}</div>
        </React.Fragment>
    )
}

ListWithStickyHeader.propTypes = {
    header: PropTypes.object,
    children: PropTypes.object
};


module.exports = ListWithStickyHeader;
