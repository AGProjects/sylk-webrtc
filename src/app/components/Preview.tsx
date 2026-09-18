'use strict';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import TransitionGroup from 'react-transition-group/TransitionGroup';
import CSSTransition from 'react-transition-group/CSSTransition';
import * as sylkrtc from 'sylkrtc';
import debug from 'debug';
import { ListGroup, ListGroupItem } from 'react-bootstrap';
import ConferenceDrawer from './ConferenceDrawer';
import VolumeBar from './VolumeBar';
import { usePreferences } from '../PreferencesProvider';

const DEBUG = debug('blinkrtc:Preview');

interface PreviewProps {
    hangupCall: () => void;
}

const Preview = ({ hangupCall }: PreviewProps) => {
    const { preferences, updatePreferences } = usePreferences();

    const localVideo = useRef<HTMLVideoElement>(null);
    // Canonical handle for stopping tracks synchronously (unmount, hangup,
    // switching devices) - mediaStream state exists only to re-render and
    // hand a live stream to <VolumeBar>, so the two are always set together.
    const streamRef = useRef<MediaStream | null>(null);

    const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
    const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
    const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
    const [showDrawer, setShowDrawer] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const startPreview = useCallback(async (videoDeviceId?: string, audioDeviceId?: string) => {
        setError(null);
        streamRef.current?.getTracks().forEach((track) => track.stop());

        try {
            const constraints: MediaStreamConstraints = {
                video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
                audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            setMediaStream(stream);

            // Labels are only populated once permission has been granted,
            // so (re)enumerate after getUserMedia succeeds.
            const devices = await navigator.mediaDevices.enumerateDevices();
            // Chrome injects virtual entries whose deviceId is literally
            // "default"/"communications" (label varies by OS locale) to
            // represent the OS default device. That collides with our own
            // 'default' sentinel for "no explicit device chosen", so drop
            // them - we already render our own explicit "System default" row.
            const isRealDevice = (d: MediaDeviceInfo) => d.deviceId !== 'default' && d.deviceId !== 'communications';
            setVideoDevices(devices.filter((d) => d.kind === 'videoinput' && isRealDevice(d)));
            setAudioDevices(devices.filter((d) => d.kind === 'audioinput' && isRealDevice(d)));
        } catch (err) {
            DEBUG('Device access failed: %o', err);
            streamRef.current = null;
            setMediaStream(null);
            setError('Could not access your camera or microphone. Check your browser permissions.');
        }
    }, []);

    // Start once on mount, seeded from the account's saved preferences.
    useEffect(() => {
        const initialVideoId = preferences.videoInputDeviceId !== 'default' ? preferences.videoInputDeviceId : undefined;
        const initialAudioId = preferences.audioInputDeviceId !== 'default' ? preferences.audioInputDeviceId : undefined;
        startPreview(initialVideoId, initialAudioId);

        return () => {
            streamRef.current?.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        };
        // Only seed from preferences once - subsequent device switches go
        // through handleSelectCamera/handleSelectMic, not this effect.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Keep the <video> element in sync with whatever stream is live.
    useEffect(() => {
        if (mediaStream && localVideo.current) {
            sylkrtc.utils.attachMediaStream(mediaStream, localVideo.current, { disableContextMenu: true, muted: true });
        } else if (localVideo.current) {
            localVideo.current.srcObject = null;
        }
    }, [mediaStream]);

    const activeVideoDeviceId = mediaStream?.getVideoTracks()[0]?.getSettings().deviceId;
    const activeAudioDeviceId = mediaStream?.getAudioTracks()[0]?.getSettings().deviceId;
    const videoLabel = mediaStream?.getVideoTracks()[0]?.label ?? (videoDevices.length ? '' : 'No Camera');
    const noCamera = videoLabel === 'No Camera';

    const handleSelectCamera = (deviceId?: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        if (deviceId === preferences.videoInputDeviceId) return;
        updatePreferences({ videoInputDeviceId: deviceId || 'default' });
        startPreview(deviceId, activeAudioDeviceId);
    };

    const handleSelectMic = (deviceId?: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        if (deviceId === preferences.audioInputDeviceId) return;
        updatePreferences({ audioInputDeviceId: deviceId || 'default' });
        startPreview(activeVideoDeviceId, deviceId);
    };

    const handleHangup = (e: React.MouseEvent) => {
        e.preventDefault();
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setMediaStream(null);
        hangupCall();
    };

    const toggleDrawer = () => setShowDrawer((v) => !v);

    const localVideoClasses = clsx({ large: true, animated: true, fadeIn: true, mirror: true });
    const textClasses = clsx({ lead: true });
    const commonButtonTopClasses = clsx({ btn: true, 'btn-link': true });
    const containerClasses = clsx({ 'video-container': true, 'drawer-visible': showDrawer });
    const iconClasses = clsx({ 'video-icon': true, 'drawer-visible': showDrawer });

    const listItemStyle: React.CSSProperties = {
        width: '350px',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    };

    const cameraItems = [
        <ListGroupItem
            key="camera-default"
            style={listItemStyle}
            onClick={handleSelectCamera(undefined)}
            active={preferences.videoInputDeviceId === 'default'}
        >
            System default
        </ListGroupItem>,
        ...videoDevices.map((device) => (
            <ListGroupItem
                key={device.deviceId}
                style={listItemStyle}
                title={device.label}
                onClick={handleSelectCamera(device.deviceId)}
                active={device.deviceId === preferences.videoInputDeviceId}
            >
                {device.label}
            </ListGroupItem>
        ))
    ];

    const micItems = [
        <ListGroupItem
            key="mic-default"
            style={listItemStyle}
            onClick={handleSelectMic(undefined)}
            active={preferences.audioInputDeviceId === 'default'}
        >
            System default
        </ListGroupItem>,
        ...audioDevices.map((device) => (
            <ListGroupItem
                key={device.deviceId}
                style={listItemStyle}
                title={device.label}
                onClick={handleSelectMic(device.deviceId)}
                active={device.deviceId === preferences.audioInputDeviceId}
            >
                {device.label}
            </ListGroupItem>
        ))
    ];

    const topButtons = !showDrawer
        ? [
              <button key="sbButton" type="button" title="Open Drawer" className={commonButtonTopClasses} onClick={toggleDrawer}>
                  <i className="fa fa-bars fa-2x"></i>
              </button>
          ]
        : [];

    const header = (
        <CSSTransition key="header-container" classNames="videoheader" timeout={{ enter: 300, exit: 300 }}>
            <div key="header-container">
                <div key="header" className="call-header">
                    <div className="container-fluid" style={{ position: 'relative' }}>
                        <p className={textClasses}><strong>Preview</strong></p>
                        <p className={textClasses}>{error || videoLabel}</p>
                        <div className="conference-top-buttons">{topButtons}</div>
                    </div>
                </div>
                {mediaStream && <VolumeBar localMedia={mediaStream} />}
            </div>
        </CSSTransition>
    );

    return (
        <div>
            {noCamera && (
                <div className={iconClasses}>
                    <p><i className="fa fa-video-camera-slash fa-5 fa-fw"></i></p>
                    <p className="lead">No camera detected</p>
                </div>
            )}
            <div className={containerClasses}>
                <div className="top-overlay">
                    <TransitionGroup>{header}</TransitionGroup>
                </div>
                <video className={localVideoClasses} id="localVideo" ref={localVideo} autoPlay muted />
                <div className="call-buttons">
                    <button key="hangupButton" type="button" className="btn btn-round-big btn-danger" onClick={handleHangup}>
                        <i className="fa fa-power-off"></i>
                    </button>
                </div>
            </div>
            <ConferenceDrawer show={showDrawer} close={toggleDrawer}>
                <div>
                    <h4 className="header">Video Camera</h4>
                    <ListGroup>{cameraItems}</ListGroup>
                    <h4 className="header">Audio Input</h4>
                    <ListGroup>{micItems}</ListGroup>
                </div>
            </ConferenceDrawer>
        </div>
    );
};

Preview.displayName = 'Preview';

export default Preview;
