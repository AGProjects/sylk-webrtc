'use strict';

const React          = require('react');
const PropTypes      = require('prop-types');
const {
    ResponsiveContainer,
    AreaChart,
    Area }          = require('recharts');


const AreaGradientGraph = ({
    data,
    dataKey,
    height,
    color
}) => {
    let stroke = '#2e6da4';
    let fill = 'url(#colorBlue)';

    if (color && color === 'green') {
        fill = 'url(#colorGreen)';
        stroke = '#4cae4c';
    }
    if (!height) {
        height = 60
    }

    return (
        <ResponsiveContainer width="100%" height={height}>
            <AreaChart
                width={150}
                height={height}
                data={data}
                margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
            >
                <defs>
                    <linearGradient id="colorBlue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#337ab7" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#337ab7" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorGreen" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#5cb85c" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#5cb85c" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <Area
                    type="linear"
                    dataKey={dataKey}
                    isAnimationActive={false}
                    stroke={stroke}
                    fillOpacity={1}
                    fill={fill}
                />
            </AreaChart>
        </ResponsiveContainer>
    )
};

AreaGradientGraph.propTypes = {
    data: PropTypes.array.isRequired,
    dataKey: PropTypes.string.isRequired,
    height: PropTypes.number,
    color: PropTypes.string
};


module.exports = AreaGradientGraph;

