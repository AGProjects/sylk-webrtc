'use strict';

const React = require('react');
const useEffect = React.useEffect;
const useRef = React.useRef;

const usePrevious = (value) => {
    const ref = useRef([]);
    useEffect(() => {
        ref.current = value;
    }, [value]);

    return ref.current;
}

export { usePrevious };
