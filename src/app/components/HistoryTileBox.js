'use strict';

const React         = require('react');
const PropTypes     = require('prop-types');

const Mui           = require('material-ui');
const Grid          = Mui.Grid;


const HistoryTileBox = (props) => {
    return (
        <div className="history-tile-box">
            <Grid
                container
                direction="row"
                justify="center"
                alignItems="center"
                spacing={16}
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
