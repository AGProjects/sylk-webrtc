import React, { useState } from 'react';
import { Paper, IconButton } from '@material-ui/core';
import { PlayArrowRounded } from '@material-ui/icons';

import fileTransferUtils  from '../../fileTransferUtils';


interface VideoPlayerProps {
    account: unknown;
    message: unknown;
    thumbnail: string;
    width?: number | string;
    height?: number | string;
    duration?: number;
}

const formatDuration = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);

    return `${m}:${s.toString().padStart(2, '0')}`;
};

export default function VideoPlayer({
    account,
    message,
    thumbnail,
    width,
    height,
    duration,
}: VideoPlayerProps) {
    const [videoSrc, setVideoSrc] = useState<string | null>(null);

    const handlePlay = async (): Promise<void> => {
        const [data] = await fileTransferUtils.getAndReadFile(account, message);
        setVideoSrc(data);
    };

    if (videoSrc) {
        return (
            <Paper variant="outlined" style={{ display: 'inline-block', borderRadius: 7, overflow: 'hidden' }}>
                <video
                    src={videoSrc}
                    controls
                    autoPlay
                    controlsList="nodownload"
                    style={{
                        ...(width ? { width } : {}),
                        ...(height ? { height } : {}),
                    }}
                />
            </Paper>
        );
    }

    return (
        <Paper variant="outlined" style={{ display: 'inline-block', borderRadius: 7, overflow: 'hidden', cursor: 'pointer', position: 'relative' }}>
            <img className="img-responsive img-rounded" style={{ ...width && { width }, ...height && { height } }} src={thumbnail} alt="Video Thumbnail" />
            {duration != null && (
                <span
                    style={{
                        position: 'absolute',
                        bottom: 4,
                        right: 4,
                        background: 'rgba(0,0,0,0.6)',
                        color: 'white',
                        fontSize: 11,
                        padding: '1px 4px',
                        borderRadius: 3,
                    }}
                >
                    {formatDuration(duration)}
                </span>
            )}

            <div
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                }}
            >
                <IconButton
                    onClick={handlePlay}
                    style={{
                        background: 'rgba(0,0,0,0.5)',
                        color: 'white',
                    }}
                >
                    <PlayArrowRounded style={{ fontSize: '3rem' }} />
                </IconButton>
            </div>
        </Paper>
    );
}
