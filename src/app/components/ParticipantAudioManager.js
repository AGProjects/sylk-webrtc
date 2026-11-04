const React = require('react');
const debug = require('debug');
const { useRef, useImperativeHandle, useEffect, useCallback, forwardRef } = React;

const DEBUG = debug('blinkrtc:ParticipantAudioManager');

const ParticipantAudioManager = forwardRef((props, ref) => {
    const containerRef = useRef(null);
    const audioElements = useRef({}); // { participantId: HTMLAudioElement }

    const createAudio = (participantId) => {
        DEBUG('Adding audio for %s', participantId);
        let audioElement = audioElements.current[participantId];
        if (!audioElement && containerRef.current) {
            DEBUG('Really adding audio for %s', participantId);
            audioElement = document.createElement('audio');
            audioElement.autoplay = true;
            containerRef.current.appendChild(audioElement);
            audioElements.current[participantId] = audioElement;
        }
        return audioElement || null;
    };

    const setAllMute = (muted) => {
        DEBUG('Set all audio muted: %s', muted);
        Object.values(audioElements.current).forEach((audioElement) => {
            audioElement.muted = muted;
        });
    };

    const removeAudio = useCallback((participantId) => {
        DEBUG('Remove audio for %s', participantId);
        const audioElement = audioElements.current[participantId];

        if (audioElement) {
            audioElement.pause();
            audioElement.srcObject = null;
            audioElement.remove();
            delete audioElements.current[participantId];
        }
    }, []);

    const destroy = useCallback(() => {
        DEBUG('Destroy all audio');
        Object.keys(audioElements.current).forEach(removeAudio);
    }, [removeAudio]);

    useImperativeHandle(ref, () => ({ createAudio, removeAudio, setAllMute, destroy }));

    useEffect(() => {
        return () => destroy();
    }, [destroy]);

    return <div ref={containerRef} style={{ display: 'none' }} />;
});

ParticipantAudioManager.displayName = 'ParticipantAudioManager';
module.exports = ParticipantAudioManager;
