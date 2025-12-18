const React = require('react');
const { useState, useRef, useImperativeHandle, forwardRef } = React;

const ParticipantAudioManager = forwardRef((props, ref) => {
    const [audios, setAudios] = useState({}); // { id: true }
    const audioRefs = useRef({}); // { id: HTMLAudioElement }

    // Create audio element for a participant
    const createAudio = (id) => {
        if (!audios[id]) {
            setAudios(prev => ({ ...prev, [id]: true }));
        }
        return audioRefs.current[id] || null;
    };


    const setAllMute = (muted) => {
        Object.values(audioRefs.current).forEach(el => {
            if (el) el.muted = muted;
        });
    };

    // Remove audio element
    const removeAudio = (id) => {
        setAudios(prev => {
            const { [id]: _, ...rest } = prev;
            return rest;
        });
        delete audioRefs.current[id];
    };
    const destroy = () => {
        setAudios({});
        audioRefs.current = {};
    };

    useImperativeHandle(ref, () => ({
        createAudio,
        removeAudio,
        setAllMute,
        destroy
    }));

    return (
        <div style={{ display: 'none' }}>
            {Object.keys(audios).map(id => (
                <audio
                    key={id}
                    autoPlay
                    ref={el => {
                        if (el) audioRefs.current[id] = el;
                    }}
                />
            ))}
        </div>
    );
});

ParticipantAudioManager.displayName = 'ParticipantAudioManager';
module.exports = ParticipantAudioManager;
