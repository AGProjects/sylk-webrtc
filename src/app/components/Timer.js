'use strict';

const React = require('react');
const { useState, useEffect, useRef } = React;
const { DateTime } = require('luxon');

const Timer = ({ startTime, updateInterval = 300 }) => {
  const [duration, setDuration] = useState('00:00:00');
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!startTime) return;

    const tick = () => {
        const elapsed = DateTime.local().diff(startTime, 'seconds');
        const formatted = elapsed.toFormat('hh:mm:ss');
        setDuration(formatted);
    };
    tick();

    intervalRef.current = setInterval(tick, updateInterval);

    return () => clearInterval(intervalRef.current);
  }, [startTime, updateInterval]);

  return <>{duration}</>;
}

Timer.propTypes = {
        startTime: PropTypes.object,
        updateInterval: PropTypes.number
};

module.exports = Timer;
