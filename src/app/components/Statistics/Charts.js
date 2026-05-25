
'use strict';

const React = require('react');
const PropTypes = require('prop-types');

const { makeStyles } = require('@material-ui/core/styles');

const AreaGradientChart = require('./AreaGradientChart');
const LineChart = require('./LineChart')


const styleSheet = makeStyles((theme) => ({
    graphText: {
        width: '48%',
        fontSize: '12px'
    }
}));

const isFloat = (n) => {
    return Number(n) === n && n % 1 !== 0;
};

const prefixBits = (bits) => {
    let i = -1;
    const byteUnits = 'kMGTPEZY';
    do {
        bits = bits / 1000;
        i++;
    } while (bits > 1000);

    return `${Math.max(bits, 0.1).toFixed(bits < 10 ? 1 : 0)} ${byteUnits[i]}bits/s`;
};

const Charts = ({
    data,
    videoElements,
    lastData,
    video,
    details
}) => {
    const classes = styleSheet();
    const lastGraphData = data[data.length - 1];
    const videoGraphs = video !== undefined && video !== false;
    const showDetails = details !== undefined && details !== false;

    let localFrameRate = 0;
    let remoteFrameRate = 0;
    let packetsLostOutboundPercentage = 0;
    let packetsLostInboundPercentage = 0;
    let remoteResolution, localResolution;

    if (videoGraphs) {
        const videoData = lastData && lastData.video;
        const videoDataInbound = videoData && videoData.inbound && videoData.inbound[0];
        const videoDataOutbound = videoData && videoData.outbound && videoData.outbound[0];

        localFrameRate = videoDataOutbound && (videoDataOutbound.framesPerSecond || videoDataOutbound.framerateMean)
        localResolution = videoDataOutbound && [videoDataOutbound.frameWidth, videoDataOutbound.frameHeight].join(' x ');
        localFrameRate = isFloat(localFrameRate) && localFrameRate.toFixed(1);
        remoteFrameRate = videoDataInbound && (videoDataInbound.framesPerSecond || videoDataInbound.framerateMean)
        remoteResolution = videoDataInbound && [videoDataInbound.frameWidth, videoDataInbound.frameHeight].join(' x ');
        remoteFrameRate = isFloat(remoteFrameRate) && remoteFrameRate.toFixed(1);

        // Firefox does not support video size from getStats(), so we get it from the video element
        if (remoteResolution === ' x ' && videoElements.remoteVideo) {
            remoteResolution = `${videoElements.remoteVideo.current && videoElements.remoteVideo.current.videoWidth} x ${videoElements.remoteVideo.current && videoElements.remoteVideo.current.videoHeight}`;
        }
        if (localResolution === ' x ' && videoElements.localVideo) {
            localResolution = `${videoElements.localVideo.current && videoElements.localVideo.current.videoWidth} x ${videoElements.localVideo.current && videoElements.localVideo.current.videoHeight}`;
        }
    }

    let inboundPacketsLost = lastGraphData && lastGraphData.packetsLostInbound;
    let outboundPacketsLost = lastGraphData && lastGraphData.packetsLostOutbound;
    let inboundPackets = lastGraphData && lastGraphData.packetRateInbound;
    let outboundPackets = lastGraphData && lastGraphData.packetRateOutbound;
    packetsLostOutboundPercentage = (outboundPacketsLost / outboundPackets) * 100;
    packetsLostInboundPercentage = (inboundPacketsLost / inboundPackets) * 100;

    return (
        <div>
            {videoGraphs && showDetails &&
                <table className="table table-condensed table-bordered">
                    <thead>
                        <tr>
                            <th></th>
                            <th style={{ width: '30%' }}>Incoming</th>
                            <th style={{ width: '30%' }}>Outgoing</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Resolution</td>
                            <td>{remoteResolution}</td>
                            <td>{localResolution}</td>
                        </tr>
                        {localFrameRate && remoteFrameRate &&
                            <tr>
                                <td>Framerate</td>
                                <td>{remoteFrameRate}</td>
                                <td>{localFrameRate}</td>
                            </tr>
                        }
                    </tbody>
                </table>
            }
            <h5>Bandwidth</h5>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className={classes.graphText}>In: {lastGraphData.incomingBitrate && prefixBits(lastGraphData.incomingBitrate)}</div>
                <div className={classes.graphText}>Out: {lastGraphData.outgoingBitrate && prefixBits(lastGraphData.outgoingBitrate)}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '48%' }}>
                    <AreaGradientChart data={data} dataKey="incomingBitrate" color="green" height={70} />
                </div>
                <div style={{ width: '48%' }}>
                    <AreaGradientChart data={data} dataKey="outgoingBitrate" height={70} />
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '100%' }}>
                    <h5>Latency (RTT): {lastGraphData.latency && (lastGraphData.latency * 1000).toFixed(2)} ms</h5>
                    <AreaGradientChart data={data} dataKey="latency" color="blue" />
                </div>
                {/* <div style={{width: '48%' }}>
                     <h5>Jitter: {lastGraphData.jitter && lastGraphData.jitter.toFixed(4)}</h5>
                     <LineChart data={data} dataKey="jitter" height={60} type="monotone" />
                </div> */}
            </div>

            <h5>Packet Loss</h5>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div className={classes.graphText}>
                    In: {lastGraphData.packetsLostInbound && lastGraphData.packetsLostInbound.toFixed(0)}
                    &nbsp;({packetsLostInboundPercentage.toFixed(2)} %)
                </div>
                <div className={classes.graphText}>
                    Out: {lastGraphData.packetsLostOutbound && lastGraphData.packetsLostOutbound.toFixed(0)}
                    &nbsp;({packetsLostOutboundPercentage.toFixed(2)} %)
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '48%' }}>
                    <LineChart data={data} dataKey="packetsLostInbound" height={60} />
                </div>
                <div style={{ width: '48%' }}>
                    <LineChart data={data} dataKey="packetsLostOutbound" height={60} />
                </div>
            </div>

        </div>
    )
};

Charts.propTypes = {
    data: PropTypes.array.isRequired,
    lastData: PropTypes.object.isRequired,
    videoElements: PropTypes.object,
    video: PropTypes.bool,
    details: PropTypes.bool
};


module.exports = Charts;

