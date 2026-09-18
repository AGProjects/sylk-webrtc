import React, { useEffect, useMemo } from 'react';
import clsx from 'clsx';
import { Media } from 'react-bootstrap';
import { useInView } from 'react-intersection-observer';
import { DateTime, Duration } from 'luxon';
import { useAddressbook } from '../../AddressbookProvider';
import UserIcon from '../UserIcon';

interface CallCdr {
    direction: 'incoming' | 'outgoing';
    duration: number; // seconds
    outcome: string;
    remoteParty: string;
    sessionId: string;
    source: string;
    media: string[];
    startTime: Date;
    stopTime: Date;
    version: number;
    local?: {
        streams: unknown[];
        deviceId: string;
    };
}

interface IdentityLike {
    displayName?: string;
    uri: string;
}

interface CallMessageProps {
    message: {
        json: CallCdr;
        timestamp: Date;
    };
    cont?: boolean;
    scroll: () => void;
    identity: IdentityLike;
}

function durationToHuman(duration, { unitDisplay = 'short', listStyle = 'narrow' } = {}) {
    const values = duration.toObject ? duration.toObject() : duration;
    const units = ['weeks', 'days', 'hours', 'minutes', 'seconds', 'milliseconds'];

    const parts = units
        .filter((u) => values[u])
        .map((u) =>
            new Intl.NumberFormat('en', { style: 'unit', unit: u.replace(/s$/, ''), unitDisplay }).format(values[u])
        );

    return parts.length
        ? new Intl.ListFormat('en', { style: listStyle, type: 'conjunction' }).format(parts)
        : '';
}

function renderCallStatusRow(direction: 'in' | 'out', label: string, isVideo: boolean) {
    const isOutgoing = direction === 'out';
    const color = isOutgoing ? '#007bff' : '#28a745'; // Bootstrap primary / success
    const iconClass = isVideo ? 'fa fa-video-camera' : `fa fa-phone${isOutgoing ? ' fa-flip-horizontal' : ''}`;

    return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, paddingBottom: '4px', color: '#6c757d' }}>
            <i
                className={iconClass}
                style={{ fontSize: '1em', color }}
            ></i>
            <span style={{ fontSize: 'inherit' }}>{label}</span>
        </span>
    );
}

const CallMessage = ({ message, cont, scroll, identity }: CallMessageProps) => {
    const { lookup } = useAddressbook();
    const cdr = message.json;
    const isOutgoing = cdr.direction === 'outgoing';

    const contact = useMemo(() => lookup(cdr.remoteParty), [lookup, cdr.remoteParty]);
    const renderIdentity: IdentityLike = isOutgoing ? identity : contact.identity;

    const { ref } = useInView({ threshold: 0 });

    const isVideo = cdr.media?.includes('video') ?? false;

    const parsedContent = useMemo(() => {
        const duration = Duration.fromObject({ seconds: cdr.duration });
        const callType = isVideo ? 'video call' : 'call';
        const label = `${isOutgoing ? 'Outgoing' : 'Incoming'} ${callType} (${durationToHuman(duration)})`;
        return renderCallStatusRow(isOutgoing ? 'out' : 'in', label, isVideo);
    }, [cdr.duration, isOutgoing]);

    useEffect(() => {
        scroll();
    }, [parsedContent, scroll]);

    const theme = clsx({ 'text-left': true, continued: cont });
    const time = DateTime.fromJSDate(message.timestamp).toFormat('HH:mm');

    if (cont) {
        return (
            <div ref={ref}>
                <Media className={theme}>
                    <Media.Left className="timestamp-continued"><span>{time}</span></Media.Left>
                    <Media.Body className="vertical-center">{parsedContent}</Media.Body>
                </Media>
            </div>
        );
    }

    return (
        <div ref={ref}>
            <Media className={theme}>
                <Media.Left>
                    <UserIcon identity={renderIdentity} />
                </Media.Left>
                <Media.Body className="vertical-center">
                    <Media.Heading>
                        {renderIdentity.displayName || renderIdentity.uri}&nbsp;
                        <span>{time}</span>
                    </Media.Heading>
                    <div style={{ paddingRight: '15px' }}>{parsedContent}</div>
                </Media.Body>
            </Media>
        </div>
    );
};

export default CallMessage;
