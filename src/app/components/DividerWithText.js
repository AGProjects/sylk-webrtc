'use strict';
const React         = require('react');
const PropTypes     = require('prop-types');
const { Divider, Grid } = require('@material-ui/core');


const DividerWithText = ({ children }) => (
    <Grid container alignItems="center" spacing={1} >
        <Grid item xs>
            <Divider />
        </Grid>
        <Grid item>{children}</Grid>
        <Grid item xs>
            <Divider />
        </Grid>
    </Grid>
);

DividerWithText.propTypes = {
    children: PropTypes.node
};


module.exports = DividerWithText;
