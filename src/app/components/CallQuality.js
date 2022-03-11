'use strict';

const React          = require('react');
const PropTypes      = require('prop-types');
const debug          = require('debug');
const { Tooltip }    = require ('../MaterialUIAsBootstrap');
const { makeStyles }     = require('@material-ui/core/styles');

const DEBUG = debug('blinkrtc:CallQuality');


const styleSheet = makeStyles((theme) => ({
    ok: {
        color: '#5cb85c',

        '& :hover': {
            color: '#4cae4c'
        }
    },
    warning: {
        color: '#f0ad43',

        '& :hover': {
            color: '#eea236'
        }
    },
    danger: {
        color: '#d9534f',

        '& :hover': {
            color: '#d43f3a'
        }
    },
    rootThumb: {
        display: 'block',
        bottom: '25px',
        position: 'absolute',
        zIndex: 3,
        fontSize: '20px',
        right: '20px'
    }
}));

const CallQuality = ({audioData, videoData, inbound, thumb}) => {
    const classes = styleSheet();
    const [quality, setCallQuality] = React.useState(1);

    let titles = [
        '',
        '',
        'The call quality is not optimal, you can try switching to a better network, or moving closer to a WiFi access point',
        'Your network is causing poor call quality, try switching to a better network, or moving closer to a WiFi access point'
    ];

    if (inbound) {
        titles = [
            '',
            '',
            'The reception quality is not optimal, you can tell the participant to switch to a better network, or moving closer to a WiFi access point',
            'The reception quality is poor, you can tell the participant to try to switch to a better network, or moving closer to a WiFi access point'
        ];
    }

    let rootClass;
    if (thumb) {
        rootClass = classes.rootThumb;
    }

    React.useEffect(() => {
        let latencyMeasurements = [];
        let packets = 0;
        let packetsLost = 0;

        if (videoData && videoData.length !== 0) {
            const lastVideoData = videoData.slice(-30);
            latencyMeasurements = lastVideoData.map((data) => { return data.latency});
            if (inbound) {
                packets = lastVideoData.reduce((a,b) => a + b['packetRateInbound'] || 0, 0) || 0;
                packetsLost = lastVideoData.reduce((a,b) => a + b['packetsLostInbound'] || 0, 0) || 0;
            } else {
                packets = lastVideoData.reduce((a,b) => a + b['packetRateOutbound'] || 0, 0) || 0;
                packetsLost = lastVideoData.reduce((a,b) => a + b['packetsLostOutbound'] || 0, 0) || 0;
            }
        }

        if (audioData && audioData.length !== 0) {
            const lastAudioData = audioData.slice(-30);
            latencyMeasurements = latencyMeasurements.concat(lastAudioData.map((data) => { return data.latency}));
            if (inbound) {
                packets = packets + lastAudioData.reduce((a,b) => a + b['packetRateInbound'] || 0, 0) || 0;
                packetsLost = packetsLost + lastAudioData.reduce((a,b) => a + b['packetsLostInbound'] || 0, 0) || 0;
            } else {
                packets = packets + lastAudioData.reduce((a,b) => a + b['packetRateOutbound'] || 0, 0) || 0;
                packetsLost = packetsLost + lastAudioData.reduce((a,b) => a + b['packetsLostOutbound'] || 0, 0) || 0;
            }
        }

        if (audioData && audioData !== 0 || videoData && videoData.length !== 0) {
            update(latencyMeasurements, packetsLost, packets);
        }
    }, [update, audioData, videoData, inbound])

    const update = React.useCallback((latencyMeasurements, packetsLost, packets) => {
        latencyMeasurements = latencyMeasurements.filter(data => data !== 0 && data !== undefined);
        const averageLatency = latencyMeasurements.reduce((sum, value) => {
            return sum + value;
        }, 0) / latencyMeasurements.length;

        const latency = (averageLatency * 1000);
        const packetLossPercentage = (packetsLost / packets) * 100;

        if (latency > 400) {
            setCallQuality(3);
            return;
        }

        let quality = 0;
        if (latency <= 300) {
            quality = 1;
        } else if (latency > 300 && latency <= 400) {
            quality = 2;
        }

        let packetLossQuality = 0;
        if (packetLossPercentage < 4) {
            packetLossQuality = 1;
        } else if (packetLossPercentage >= 4 && packetLossPercentage <= 8) {
            packetLossQuality = 2;
        } else if (packetLossPercentage > 8) {
            packetLossQuality = 3;
        }
        if (packetLossQuality > quality) {
            setCallQuality(packetLossQuality);
            if (packetLossQuality >= 2) {
                DEBUG('Bad quality: latency: %s, loss: %s', latency, packetLossPercentage);
            }
            return;
        }
        if (quality >= 2) {
           DEBUG('Bad quality: latency: %s, loss: %s', latency, packetLossPercentage);
        }
        setCallQuality(quality);
    }, []);

    return (
        <React.Fragment>
            { quality === 3 &&
                <Tooltip title={titles[quality]}>
                    <span className={rootClass}><i className={`fa fa-warning ${classes.danger}`} /></span>
                </Tooltip>
            }
            { quality === 2 &&
                <Tooltip title={titles[quality]}>
                    <span className={rootClass}><i className={`fa fa-exclamation-circle ${classes.warning}`} /></span>
                </Tooltip>
            }
        </React.Fragment>
    );
}

CallQuality.propTypes = {
    audioData: PropTypes.array,
    videoData: PropTypes.array,
    inbound: PropTypes.bool,
    thumb: PropTypes.bool
};


module.exports = CallQuality;
