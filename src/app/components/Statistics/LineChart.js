'use strict';

const React          = require('react');
const PropTypes      = require('prop-types');

const {
    ResponsiveContainer,
    LineChart,
    Line } = require('recharts');

const SylkLineChart = ({
    data,
    dataKey,
    height,
    type
}) => {
    if (!height) {
        height = 60
    }
    if (!type) {
        type = 'step';
    }

    return (
        <ResponsiveContainer width="100%" height={height}>
            <LineChart
                width={150}
                height={height}
                data={data}
                margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
            >
                <Line
                    type={type}
                    dataKey={dataKey}
                    isAnimationActive={false}
                    stroke="#2e6da4"
                    dot={false}
                />
            </LineChart>
        </ResponsiveContainer>
    )
};

SylkLineChart.propTypes = {
    data: PropTypes.array.isRequired,
    dataKey: PropTypes.string.isRequired,
    height: PropTypes.number,
    type: PropTypes.string
};


module.exports = SylkLineChart;

