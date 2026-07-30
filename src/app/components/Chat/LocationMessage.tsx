import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Media } from 'react-bootstrap';
import { DateTime } from 'luxon';
import { Card } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
    LocationOn as LocationOnIcon,
    OpenInNew as OpenInNewIcon,
    FileCopyOutlined as FileCopyOutlinedIcon,
    Check as CheckIcon
} from '@material-ui/icons';
import * as L from 'leaflet';

import UserIcon from '../UserIcon';

require('leaflet/dist/leaflet.css');

type LatLng = [number, number];

interface TrailPoint {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    timestamp?: string | number | Date;
}

interface LocationBubbleMessage {
    id?: string;
    timestamp?: string | number | Date;
    sender?: { uri?: string; displayName?: string | null };
    locationTrail?: TrailPoint[];
    locationExpires?: string | number | Date | null;
    locationEnded?: boolean;
}

interface Props {
    message: LocationBubbleMessage;
    cont?: boolean;
    scroll?: () => void;
    identity?: any;
}

const TILE_URL = 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png';
const TILE_SUBDOMAINS = ['a', 'b', 'c'];
const ATTRIBUTION = '© OpenStreetMap contributors';
const MAX_ZOOM = 19;
const DEFAULT_ZOOM = 16;

const styleSheet = makeStyles((theme) => ({
    '@keyframes livePulse': {
        '0%': { boxShadow: '0 0 0 0 rgba(76, 175, 80, 0.6)' },
        '70%': { boxShadow: '0 0 0 6px rgba(76, 175, 80, 0)' },
        '100%': { boxShadow: '0 0 0 0 rgba(76, 175, 80, 0)' }
    },
    card: {
        width: 560,
        maxWidth: '100%',
        borderRadius: 10,
        overflow: 'hidden',
        fontFamily: 'inherit'
    },
    map: {
        width: '100%',
        height: 380,
        backgroundColor: theme.palette.action.hover,
        '& .leaflet-pane, & .leaflet-top, & .leaflet-bottom': {
            zIndex: 1
        }
    },
    scrubRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 10px 2px'
    },
    scrubber: {
        flexGrow: 1,
        margin: 0,
        cursor: 'pointer',
        accentColor: '#c0392b'
    },
    scrubCaption: {
        padding: '0 10px 6px',
        fontSize: 11,
        color: theme.palette.text.secondary
    },
    scrubLiveBtn: {
        border: 'none',
        background: 'none',
        padding: 0,
        fontSize: 11,
        fontWeight: 600,
        fontFamily: 'inherit',
        color: '#2f6fb3',
        cursor: 'pointer',
        whiteSpace: 'nowrap'
    },
    coordRow: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '4px 10px 8px'
    },
    coordText: {
        fontFamily: 'monospace',
        fontSize: 12,
        color: theme.palette.text.primary,
        userSelect: 'text',
        cursor: 'text'
    },
    coordBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        border: 'none',
        background: 'none',
        padding: 0,
        fontSize: 12,
        fontFamily: 'inherit',
        color: '#2f6fb3',
        cursor: 'pointer',
        whiteSpace: 'nowrap'
    },
    coordBtnIcon: {
        fontSize: 14
    },
    header: {
        display: 'flex',
        alignItems: 'center',
        padding: '6px 10px',
        gap: 6
    },
    headerIcon: {
        fontSize: 18,
        color: '#c0392b'
    },
    title: {
        flexGrow: 1,
        fontSize: 13,
        fontWeight: 600,
        color: theme.palette.text.primary,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis'
    },
    liveChip: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11,
        fontWeight: 600,
        color: '#2e7d32',
        textTransform: 'uppercase',
        letterSpacing: 0.4
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: '50%',
        backgroundColor: '#4caf50',
        animation: '$livePulse 1.6s infinite'
    },
    endedChip: {
        fontSize: 11,
        fontWeight: 600,
        color: theme.palette.text.secondary,
        textTransform: 'uppercase',
        letterSpacing: 0.4
    },
    footer: {
        display: 'flex',
        alignItems: 'center',
        padding: '6px 10px',
        borderTop: `1px solid ${theme.palette.divider}`,
        fontSize: 12,
        color: theme.palette.text.secondary,
        gap: 8
    },
    stat: {
        whiteSpace: 'nowrap'
    },
    spacer: {
        flexGrow: 1
    },
    mapsLink: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        color: '#2f6fb3',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        '&:hover': { textDecoration: 'underline' }
    },
    mapsLinkIcon: {
        fontSize: 14
    }
}));

function buildPinIcon(live: boolean): any {
    const color = live ? '#c0392b' : '#7f8c8d';
    const html =
        '<div style="transform:translate(-50%,-100%);">' +
            '<svg width="26" height="34" viewBox="0 0 26 34" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M13 0C5.8 0 0 5.8 0 13c0 9.2 13 21 13 21s13-11.8 13-21C26 5.8 20.2 0 13 0z" fill="' + color + '"/>' +
                '<circle cx="13" cy="13" r="5" fill="#fff"/>' +
            '</svg>' +
        '</div>';
    return (L as any).divIcon({
        className: 'sylk-location-pin',
        html: html,
        iconSize: [26, 34],
        iconAnchor: [0, 0]
    });
}

function toLatLng(point: any): LatLng | null {
    if (!point) return null;
    const lat = Number(point.latitude);
    const lng = Number(point.longitude);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    return [lat, lng];
}

function formatCountdown(ms: number): string | null {
    if (ms <= 0) return null;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const pad = (n: number) => String(n).padStart(2, '0');
    if (hours > 0) {
        return `${hours}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
}

function formatAgo(ms: number): string {
    if (ms < 0) ms = 0;
    const s = Math.floor(ms / 1000);
    if (s < 5) return 'just now';
    if (s < 60) return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    return `${h}h ago`;
}

const LocationMessage = ({ message, cont, scroll, identity }: Props) => {
    const classes = styleSheet();

    const mapNodeRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const scrubMarkerRef = useRef<any>(null);
    const trailRef = useRef<any>(null);
    const accuracyRef = useRef<any>(null);
    const resizeObserverRef = useRef<any>(null);
    const didFitRef = useRef<boolean>(false);

    const [now, setNow] = useState<number>(() => Date.now());
    const [scrubIndex, setScrubIndex] = useState<number | null>(null);
    const [copied, setCopied] = useState<boolean>(false);

    const trail: TrailPoint[] = Array.isArray(message.locationTrail) ? message.locationTrail : [];
    const latest = trail.length > 0 ? trail[trail.length - 1] : null;
    const latestLatLng = toLatLng(latest);

    const expiresAt = message.locationExpires ? new Date(message.locationExpires).getTime() : null;
    const remainingMs = expiresAt ? expiresAt - now : null;
    const expired = remainingMs !== null && remainingMs <= 0;
    const ended = Boolean(message.locationEnded) || expired;
    const live = !ended && latestLatLng !== null;

    const time = message.timestamp ? DateTime.fromJSDate(new Date(message.timestamp)).toFormat('HH:mm') : '';

    const trailSignature = latestLatLng
        ? `${trail.length}:${latestLatLng[0].toFixed(6)},${latestLatLng[1].toFixed(6)}`
        : `${trail.length}:none`;

    const validTrail = useMemo(
        () => trail.filter(p => toLatLng(p) !== null),
        [trailSignature] // eslint-disable-line react-hooks/exhaustive-deps
    );
    const points: LatLng[] = useMemo(() => validTrail.map(toLatLng) as LatLng[], [validTrail]);
    const pointCount = points.length;
    const atLive = scrubIndex === null || scrubIndex >= pointCount - 1;
    const selIndex = pointCount > 0
        ? (atLive ? pointCount - 1 : Math.max(0, Math.min(scrubIndex as number, pointCount - 1)))
        : -1;
    const selPoint = selIndex >= 0 ? validTrail[selIndex] : null;
    const selLatLng = selIndex >= 0 ? points[selIndex] : null;

    useEffect(() => {
        if (ended) return undefined;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [ended]);

    useEffect(() => {
        if (mapRef.current || mapNodeRef.current === null) return;

        const center = latestLatLng || [0, 0];
        const map = (L as any).map(mapNodeRef.current, {
            center: center,
            zoom: latestLatLng ? DEFAULT_ZOOM : 2,
            zoomControl: true,
            attributionControl: true,
            scrollWheelZoom: false,
            dragging: true
        });

        (L as any).tileLayer(TILE_URL, {
            maxZoom: MAX_ZOOM,
            subdomains: TILE_SUBDOMAINS,
            attribution: ATTRIBUTION,
            crossOrigin: true
        }).addTo(map);

        trailRef.current = (L as any).polyline([], { color: '#c0392b', weight: 3, opacity: 0.75 }).addTo(map);
        accuracyRef.current = (L as any).circle(center, { radius: 0, color: '#c0392b', weight: 1, opacity: 0.3, fillOpacity: 0.08 }).addTo(map);
        markerRef.current = (L as any).marker(center, { icon: buildPinIcon(true), interactive: false }).addTo(map);
        scrubMarkerRef.current = (L as any).circleMarker(center, {
            radius: 8, color: '#ffffff', weight: 3, fillColor: '#2f6fb3', fillOpacity: 1
        });

        mapRef.current = map;

        const RO = (window as any).ResizeObserver;
        if (typeof RO !== 'undefined') {
            const ro = new RO(() => {
                if (mapRef.current) mapRef.current.invalidateSize();
            });
            ro.observe(mapNodeRef.current);
            resizeObserverRef.current = ro;
        }
        setTimeout(() => {
            if (mapRef.current) mapRef.current.invalidateSize();
        }, 300);

        if (typeof scroll === 'function') {
            setTimeout(() => scroll(), 350);
        }

        return () => {
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
                resizeObserverRef.current = null;
            }
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            markerRef.current = null;
            scrubMarkerRef.current = null;
            trailRef.current = null;
            accuracyRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !latestLatLng) return;

        if (trailRef.current) {
            trailRef.current.setLatLngs(points);
        }
        if (markerRef.current) {
            markerRef.current.setLatLng(latestLatLng);
            markerRef.current.setIcon(buildPinIcon(live));
        }
        if (accuracyRef.current) {
            const acc = latest && isFinite(Number(latest.accuracy)) ? Number(latest.accuracy) : 0;
            accuracyRef.current.setLatLng(latestLatLng);
            accuracyRef.current.setRadius(acc > 0 && acc < 2000 ? acc : 0);
        }

        if (scrubMarkerRef.current) {
            if (!atLive && selLatLng) {
                scrubMarkerRef.current.setLatLng(selLatLng);
                if (!map.hasLayer(scrubMarkerRef.current)) scrubMarkerRef.current.addTo(map);
            } else if (map.hasLayer(scrubMarkerRef.current)) {
                map.removeLayer(scrubMarkerRef.current);
            }
        }

        map.invalidateSize();

        if (!atLive && selLatLng) {
            map.panTo(selLatLng, { animate: true });
        } else if (points.length > 1) {
            map.fitBounds((L as any).latLngBounds(points).pad(0.25), { maxZoom: DEFAULT_ZOOM, animate: didFitRef.current });
        } else if (!didFitRef.current) {
            map.setView(latestLatLng, DEFAULT_ZOOM);
        } else {
            map.panTo(latestLatLng, { animate: true });
        }
        didFitRef.current = true;
    }, [trailSignature, live, scrubIndex]); // eslint-disable-line react-hooks/exhaustive-deps

    const activeLatLng = selLatLng || latestLatLng;

    const openInMaps = () => {
        if (!activeLatLng) return;
        const [lat, lng] = activeLatLng;
        const url = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${DEFAULT_ZOOM}/${lat}/${lng}`;
        try {
            const electron = (window as any).require ? (window as any).require('electron') : null;
            if (electron && electron.shell && electron.shell.openExternal) {
                electron.shell.openExternal(url);
                return;
            }
        } catch (e) { /* */ }
        window.open(url, '_blank', 'noopener');
    };

    const coordsText = activeLatLng
        ? `${activeLatLng[0].toFixed(6)}, ${activeLatLng[1].toFixed(6)}`
        : '';

    const copyCoords = () => {
        if (!coordsText) return;
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(coordsText);
            } else {
                const ta = document.createElement('textarea');
                ta.value = coordsText;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch (e) { /* */ }
    };

    const senderName = (identity && (identity.displayName || identity.uri))
        || (message.sender && (message.sender.displayName || message.sender.uri))
        || 'Contact';

    let titleText: string;
    if (expired) {
        titleText = 'Location sharing ended';
    } else if (message.locationEnded) {
        titleText = 'Last known location';
    } else if (latestLatLng) {
        titleText = `${senderName} is sharing location`;
    } else {
        titleText = 'Acquiring location…';
    }

    const countdown = remainingMs !== null && !expired ? formatCountdown(remainingMs) : null;
    const updatedAgo = latest && latest.timestamp ? formatAgo(now - new Date(latest.timestamp).getTime()) : null;
    const accuracy = latest && isFinite(Number(latest.accuracy)) ? Math.round(Number(latest.accuracy)) : null;
    const updateCount = trail.length;

    const card = (
        <Card variant="outlined" className={classes.card}>
            <div className={classes.header}>
                <LocationOnIcon className={classes.headerIcon} />
                <span className={classes.title}>{titleText}</span>
                {live ? (
                    <span className={classes.liveChip}>
                        <span className={classes.liveDot} />
                        Live
                    </span>
                ) : (
                    <span className={classes.endedChip}>{expired ? 'Expired' : 'Ended'}</span>
                )}
            </div>
            <div ref={mapNodeRef} className={classes.map} />
            {pointCount > 1 && (
                <>
                    <div className={classes.scrubRow}>
                        <input
                            type="range"
                            className={classes.scrubber}
                            min={0}
                            max={pointCount - 1}
                            value={selIndex}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                const v = Number(e.target.value);
                                setScrubIndex(v >= pointCount - 1 ? null : v);
                            }}
                            title="Scroll through the received positions"
                        />
                        {!atLive && (
                            <button
                                type="button"
                                className={classes.scrubLiveBtn}
                                onClick={() => setScrubIndex(null)}
                            >
                                Latest
                            </button>
                        )}
                    </div>
                    <div className={classes.scrubCaption}>
                        {atLive
                            ? `Showing latest · ${pointCount} points`
                            : `Point ${selIndex + 1} of ${pointCount}${selPoint && selPoint.timestamp
                                ? ' · ' + DateTime.fromJSDate(new Date(selPoint.timestamp)).toFormat('HH:mm:ss')
                                : ''}`}
                    </div>
                </>
            )}
            <div className={classes.footer}>
                {live && countdown && (
                    <span className={classes.stat} title="Time until the share expires">⌛ {countdown}</span>
                )}
                <span className={classes.stat} title="Number of received position updates">
                    {updateCount} update{updateCount === 1 ? '' : 's'}
                </span>
                {updatedAgo && live && (
                    <span className={classes.stat}>· {updatedAgo}</span>
                )}
                {accuracy !== null && accuracy > 0 && (
                    <span className={classes.stat}>· ±{accuracy}m</span>
                )}
                <span className={classes.spacer} />
            </div>
            {activeLatLng && (
                <div className={classes.coordRow}>
                    <span className={classes.coordText} title="Selected coordinates (lat, lng)">
                        {coordsText}
                    </span>
                    <button
                        type="button"
                        className={classes.coordBtn}
                        title="Copy coordinates"
                        onClick={copyCoords}
                    >
                        {copied
                            ? (<><CheckIcon className={classes.coordBtnIcon} />Copied</>)
                            : (<><FileCopyOutlinedIcon className={classes.coordBtnIcon} />Copy</>)}
                    </button>
                    <span className={classes.spacer} />
                    <span
                        className={classes.mapsLink}
                        onClick={openInMaps}
                        title="Open this point in a map"
                    >
                        Open<OpenInNewIcon className={classes.mapsLinkIcon} />
                    </span>
                </div>
            )}
        </Card>
    );

    const theme = cont ? 'text-left continued' : 'text-left';

    if (cont) {
        return (
            <Media className={theme}>
                <Media.Left className="timestamp-continued"><span>{time}</span></Media.Left>
                <Media.Body className="vertical-center">
                    {card}
                </Media.Body>
            </Media>
        );
    }

    return (
        <Media className={theme}>
            <Media.Left>
                <UserIcon identity={identity} />
            </Media.Left>
            <Media.Body className="vertical-center">
                <Media.Heading>
                    {senderName}&nbsp;
                    <span>{time}</span>
                </Media.Heading>
                <div style={{ paddingRight: '15px' }}>
                    {card}
                </div>
            </Media.Body>
        </Media>
    );
};

export default LocationMessage;
