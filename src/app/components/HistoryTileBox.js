'use strict';

const React         = require('react');
const PropTypes     = require('prop-types');

const { Grid }      = require('@material-ui/core');


const HistoryTileBox = (props) => {
    return (
        <div className="history-tile-box">
            <Grid
                container
                direction="row"
                justifyContent="center"
                alignItems="center"
                spacing={2}
            >
                {props.children}
            </Grid>
        </div>
    );
}

HistoryTileBox.propTypes = {
    children    : PropTypes.node
};


module.exports =  HistoryTileBox;
