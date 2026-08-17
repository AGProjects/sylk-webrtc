import React, { useEffect, useRef, useState, useMemo } from 'react';
import clsx from 'clsx';
import { Media } from 'react-bootstrap';
import { DateTime } from 'luxon';
import { Card, MenuItem } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {
    LocationOn as LocationOnIcon,
    LocationOff as LocationOffIcon,
    OpenInNew as OpenInNewIcon,
    FileCopyOutlined as FileCopyOutlinedIcon,
    Check as CheckIcon
} from '@material-ui/icons';
import * as L from 'leaflet';

import UserIcon from '../UserIcon';
import CustomContextMenu from '../CustomContextMenu';

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
    mine?: boolean;
    sender?: { uri?: string; displayName?: string | null };
    locationTrail?: TrailPoint[];
    locationPeerTrail?: TrailPoint[];
    locationStartTrail?: TrailPoint[];
    locationPeerStartTrail?: TrailPoint[];
    locationDestination?: { latitude: number; longitude: number } | null;
    locationExpires?: string | number | Date | null;
    locationEnded?: boolean;
    locationEndReason?: string | null;
    locationOneShot?: boolean;
    locationRole?: string | null;
}

interface Props {
    message: LocationBubbleMessage;
    cont?: boolean;
    scroll?: () => void;
    identity?: any;
    onStopShare?: () => void;
    selfIdentity?: any;
    peerIdentity?: any;
    removeMessage?: any;
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
    mapPlaceholder: {
        width: '100%',
        height: 380,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: theme.palette.action.hover,
        color: theme.palette.text.secondary,
        fontSize: 13,
        textAlign: 'center',
        padding: '0 24px'
    },
    placeholderIcon: {
        fontSize: 40,
        opacity: 0.45
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
    },
    stopBtn: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        border: 'none',
        background: 'none',
        padding: 0,
        fontSize: 12,
        fontWeight: 600,
        fontFamily: 'inherit',
        color: '#d9534f',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        '&:hover': { textDecoration: 'underline' }
    },
    stopBtnIcon: {
        fontSize: 15
    },
    item: {
        fontSize: '14px',
        fontFamily: 'inherit',
        color: '#333',
        minHeight: 0
    },
    danger: {
        color: '#d9534f'
    }
}));

function buildColoredPin(color: string): any {
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

function buildPinIcon(live: boolean): any {
    return buildColoredPin(live ? '#c0392b' : '#7f8c8d');
}
const PEER_PIN_COLOR = '#2f6fb3';
const DEST_PIN_COLOR = '#2e7d32';
const OWNER_DOT_COLOR = '#e74c3c';
const PEER_DOT_COLOR = '#2e86de';

function initialsFromIdentity(identity: any): string {
    const name = (identity && (identity.displayName || identity.uri)) || '';
    const cleaned = String(name).trim();
    if (!cleaned) return '';
    if (cleaned.includes('@')) {
        const local = cleaned.split('@')[0].replace(/^sips?:/i, '');
        return (local.slice(0, 2) || '').toUpperCase();
    }
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return ((parts[0][0] || '') + (parts[1][0] || '')).toUpperCase();
}

function buildPartyDotIcon(color: string, initials: string): any {
    const html =
        '<div style="transform:translate(-50%,-50%);width:26px;height:26px;border-radius:50%;' +
        'background:' + color + ';border:2px solid #fff;box-shadow:0 0 3px rgba(0,0,0,0.4);' +
        'display:flex;align-items:center;justify-content:center;color:#fff;' +
        'font-family:Helvetica,Arial,sans-serif;font-size:11px;font-weight:700;line-height:1;">' +
        (initials || '') + '</div>';
    return (L as any).divIcon({ className: 'sylk-location-party', html, iconSize: [26, 26], iconAnchor: [0, 0] });
}
function buildPartyDot(center: any, color: string, initials: string): any {
    return (L as any).marker(center, { icon: buildPartyDotIcon(color, initials), interactive: false });
}

function toLatLng(point: any): LatLng | null {
    if (!point) return null;
    const lat = Number(point.latitude);
    const lng = Number(point.longitude);
    if (!isFinite(lat) || !isFinite(lng)) return null;
    return [lat, lng];
}

function bearingDeg(a: LatLng, b: LatLng): number {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;
    const lat1 = toRad(a[0]);
    const lat2 = toRad(b[0]);
    const dLng = toRad(b[1] - a[1]);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function buildArrowIcon(color: string, deg: number): any {
    const html =
        '<div style="transform:translate(-50%,-50%) rotate(' + deg + 'deg);">' +
            '<svg width="14" height="14" viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">' +
                '<path d="M8 1 L14 14 L8 10.5 L2 14 Z" fill="' + color + '" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/>' +
            '</svg>' +
        '</div>';
    return (L as any).divIcon({
        className: 'sylk-track-arrow',
        html: html,
        iconSize: [14, 14],
        iconAnchor: [0, 0]
    });
}

const TARGET_ARROWS = 10;
function renderTrackArrows(group: any, pts: LatLng[], color: string): void {
    if (!group) return;
    group.clearLayers();
    const segs = pts.length - 1;
    if (segs < 1) return;
    const step = Math.max(1, Math.ceil(segs / TARGET_ARROWS));
    for (let i = 0; i < segs; i += step) {
        const a = pts[i];
        const b = pts[i + 1];
        if (!a || !b) continue;
        if (a[0] === b[0] && a[1] === b[1]) continue;
        const mid: LatLng = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
        (L as any).marker(mid, {
            icon: buildArrowIcon(color, bearingDeg(a, b)),
            interactive: false,
            keyboard: false
        }).addTo(group);
    }
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

const LocationMessage = ({ message, cont, scroll, identity, onStopShare, selfIdentity, peerIdentity, removeMessage }: Props) => {
    const classes = styleSheet();

    const [anchorEl, setAnchorEl] = useState(null);

    const mapNodeRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const ownDotRef = useRef<any>(null);
    const scrubMarkerRef = useRef<any>(null);
    const trailRef = useRef<any>(null);
    const arrowsRef = useRef<any>(null);
    const accuracyRef = useRef<any>(null);
    const peerMarkerRef = useRef<any>(null);
    const peerTrailRef = useRef<any>(null);
    const peerArrowsRef = useRef<any>(null);
    const destinationMarkerRef = useRef<any>(null);
    const resizeObserverRef = useRef<any>(null);
    const didFitRef = useRef<boolean>(false);

    const [now, setNow] = useState<number>(() => Date.now());
    const [scrubIndex, setScrubIndex] = useState<number | null>(null);
    const [copied, setCopied] = useState<boolean>(false);
    const [justStopped, setJustStopped] = useState<boolean>(false);

    const trail: TrailPoint[] = Array.isArray(message.locationTrail) ? message.locationTrail : [];
    const peerTrail: TrailPoint[] = Array.isArray(message.locationPeerTrail) ? message.locationPeerTrail : [];
    const startTrail: TrailPoint[] = Array.isArray(message.locationStartTrail) ? message.locationStartTrail : [];
    const peerStartTrail: TrailPoint[] = Array.isArray(message.locationPeerStartTrail) ? message.locationPeerStartTrail : [];
    const destinationLatLng = toLatLng(message.locationDestination || null);
    const oneShot = Boolean(message.locationOneShot);
    const isMeet = peerTrail.length > 0 || !!message.locationRole || destinationLatLng !== null;
    const ownInitials = initialsFromIdentity(selfIdentity);
    const peerInitials = initialsFromIdentity(peerIdentity || identity);

    const expiresAt = message.locationExpires ? new Date(message.locationExpires).getTime() : null;
    const remainingMs = expiresAt ? expiresAt - now : null;
    const expired = remainingMs !== null && remainingMs <= 0;
    const endReason = message.locationEndReason || null;
    const met = endReason === 'proximity';
    const ended = Boolean(message.locationEnded) || expired || oneShot || met || justStopped;

    const frozenStart = ended && met;
    const ownTrack = (frozenStart && startTrail.length) ? startTrail : trail;
    const peerTrack = (frozenStart && peerStartTrail.length) ? peerStartTrail : peerTrail;

    const latest = ownTrack.length > 0 ? ownTrack[ownTrack.length - 1] : null;
    const latestLatLng = toLatLng(latest);
    const peerLatest = peerTrack.length > 0 ? peerTrack[peerTrack.length - 1] : null;
    const peerLatLng = toLatLng(peerLatest);
    const live = !ended && (latestLatLng !== null || peerLatLng !== null);

    const time = message.timestamp ? DateTime.fromJSDate(new Date(message.timestamp)).toFormat('HH:mm') : '';

    const ownSig = latestLatLng
        ? `${ownTrack.length}:${latestLatLng[0].toFixed(6)},${latestLatLng[1].toFixed(6)}`
        : `${ownTrack.length}:none`;
    const peerSig = peerLatLng
        ? `${peerTrack.length}:${peerLatLng[0].toFixed(6)},${peerLatLng[1].toFixed(6)}`
        : `${peerTrack.length}:none`;
    const destSig = destinationLatLng
        ? `${destinationLatLng[0].toFixed(6)},${destinationLatLng[1].toFixed(6)}`
        : 'none';
    const trailSignature = `${ownSig}|${peerSig}|${destSig}|${frozenStart ? 'start' : 'live'}`;

    const validTrail = useMemo(
        () => ownTrack.filter(p => toLatLng(p) !== null),
        [trailSignature] // eslint-disable-line react-hooks/exhaustive-deps
    );
    const points: LatLng[] = useMemo(() => validTrail.map(toLatLng) as LatLng[], [validTrail]);
    const validPeerTrail = useMemo(
        () => peerTrack.filter(p => toLatLng(p) !== null),
        [trailSignature] // eslint-disable-line react-hooks/exhaustive-deps
    );
    const peerPoints: LatLng[] = useMemo(() => validPeerTrail.map(toLatLng) as LatLng[], [validPeerTrail]);
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
            ownDotRef.current = null;
            scrubMarkerRef.current = null;
            trailRef.current = null;
            arrowsRef.current = null;
            accuracyRef.current = null;
            peerMarkerRef.current = null;
            peerTrailRef.current = null;
            peerArrowsRef.current = null;
            destinationMarkerRef.current = null;
        };
    }, []);

    useEffect(() => {
        if (mapRef.current || mapNodeRef.current === null) return;

        const center = latestLatLng || peerLatLng || destinationLatLng;
        if (!center) return;

        const map = (L as any).map(mapNodeRef.current, {
            center: center,
            zoom: DEFAULT_ZOOM,
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
        arrowsRef.current = (L as any).layerGroup().addTo(map);
        accuracyRef.current = (L as any).circle(center, { radius: 0, color: '#c0392b', weight: 1, opacity: 0.3, fillOpacity: 0.08 }).addTo(map);
        peerTrailRef.current = (L as any).polyline([], { color: PEER_PIN_COLOR, weight: 3, opacity: 0.7 });
        peerArrowsRef.current = (L as any).layerGroup();
        peerMarkerRef.current = buildPartyDot(center, PEER_DOT_COLOR, peerInitials);
        ownDotRef.current = buildPartyDot(center, OWNER_DOT_COLOR, ownInitials);
        destinationMarkerRef.current = (L as any).marker(center, { icon: buildColoredPin(DEST_PIN_COLOR), interactive: false });
        markerRef.current = (L as any).marker(center, { icon: buildPinIcon(true), interactive: false });
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
    }, [trailSignature]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        const map = mapRef.current;
        const anchor = latestLatLng || peerLatLng || destinationLatLng;
        if (!map || !anchor) return;

        if (trailRef.current) {
            trailRef.current.setLatLngs(points);
        }
        if (arrowsRef.current) {
            renderTrackArrows(arrowsRef.current, points, '#c0392b');
        }
        {
            const ownPin = markerRef.current;
            const ownDot = ownDotRef.current;
            if (latestLatLng) {
                const active = isMeet ? ownDot : ownPin;
                const inactive = isMeet ? ownPin : ownDot;
                if (active) {
                    active.setLatLng(latestLatLng);
                    if (active.setIcon) active.setIcon(isMeet ? buildPartyDotIcon(OWNER_DOT_COLOR, ownInitials) : buildPinIcon(live));
                    if (!map.hasLayer(active)) active.addTo(map);
                }
                if (inactive && map.hasLayer(inactive)) map.removeLayer(inactive);
            } else {
                if (ownPin && map.hasLayer(ownPin)) map.removeLayer(ownPin);
                if (ownDot && map.hasLayer(ownDot)) map.removeLayer(ownDot);
            }
        }
        if (accuracyRef.current) {
            const acc = latest && isFinite(Number(latest.accuracy)) ? Number(latest.accuracy) : 0;
            accuracyRef.current.setLatLng(latestLatLng || anchor);
            accuracyRef.current.setRadius(latestLatLng && acc > 0 && acc < 2000 ? acc : 0);
        }

        if (peerTrailRef.current) {
            peerTrailRef.current.setLatLngs(peerPoints);
            if (peerPoints.length > 1 && !map.hasLayer(peerTrailRef.current)) peerTrailRef.current.addTo(map);
        }
        if (peerArrowsRef.current) {
            renderTrackArrows(peerArrowsRef.current, peerPoints, PEER_PIN_COLOR);
            if (peerPoints.length > 1 && !map.hasLayer(peerArrowsRef.current)) peerArrowsRef.current.addTo(map);
        }
        if (peerMarkerRef.current) {
            if (peerLatLng) {
                peerMarkerRef.current.setLatLng(peerLatLng);
                if (peerMarkerRef.current.setIcon) peerMarkerRef.current.setIcon(buildPartyDotIcon(PEER_DOT_COLOR, peerInitials));
                if (!map.hasLayer(peerMarkerRef.current)) peerMarkerRef.current.addTo(map);
            } else if (map.hasLayer(peerMarkerRef.current)) {
                map.removeLayer(peerMarkerRef.current);
            }
        }
        if (destinationMarkerRef.current) {
            if (destinationLatLng) {
                destinationMarkerRef.current.setLatLng(destinationLatLng);
                if (!map.hasLayer(destinationMarkerRef.current)) destinationMarkerRef.current.addTo(map);
            } else if (map.hasLayer(destinationMarkerRef.current)) {
                map.removeLayer(destinationMarkerRef.current);
            }
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

        const allPoints: LatLng[] = points.slice();
        for (const p of peerPoints) allPoints.push(p);
        if (destinationLatLng) allPoints.push(destinationLatLng);

        if (!atLive && selLatLng) {
            map.panTo(selLatLng, { animate: true });
        } else if (allPoints.length > 1) {
            map.fitBounds((L as any).latLngBounds(allPoints).pad(0.25), { maxZoom: DEFAULT_ZOOM, animate: didFitRef.current });
        } else if (!didFitRef.current) {
            map.setView(anchor, DEFAULT_ZOOM);
        } else {
            map.panTo(anchor, { animate: true });
        }
        didFitRef.current = true;
    }, [trailSignature, live, scrubIndex]); // eslint-disable-line react-hooks/exhaustive-deps

    const activeLatLng = selLatLng || latestLatLng || peerLatLng || destinationLatLng;

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

    const mine = message.mine === true;
    const senderName = mine ? 'You'
        : ((identity && (identity.displayName || identity.uri))
        || (message.sender && (message.sender.displayName || message.sender.uri))
        || 'Contact');

    let titleText: string;
    if (oneShot) {
        titleText = 'Location point';
    } else if (isMeet && met) {
        titleText = 'Meet-up succeeded';
    } else if (isMeet && !ended) {
        titleText = mine ? 'Meet-up location sharing' : `Meeting up with ${senderName}`;
    } else if (isMeet && ended) {
        if (endReason === 'expired') {
            titleText = 'Meet-up expired';
        } else if (endReason === 'rejected') {
            titleText = 'Meet-up rejected';
        } else if (endReason === 'cancelled' || endReason === 'declined' || endReason === 'deleted') {
            titleText = 'Meet-up cancelled';
        } else {
            titleText = 'Meet-up ended';
        }
    } else if (endReason === 'returned') {
        titleText = `${senderName} returned`;
    } else if (expired) {
        titleText = 'Location sharing ended';
    } else if (ended) {
        titleText = 'Location sharing';
    } else if (latestLatLng || peerLatLng) {
        titleText = mine ? 'Sharing my location' : `${senderName} is sharing location`;
    } else {
        titleText = 'Location unavailable';
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
                ) : oneShot ? null : (
                    <span className={classes.endedChip}>
                        {met ? 'Met' : expired ? 'Expired' : 'Ended'}
                    </span>
                )}
            </div>
            {(latestLatLng || peerLatLng || destinationLatLng) ? (
                <div ref={mapNodeRef} className={classes.map} />
            ) : (
                <div className={classes.mapPlaceholder}>
                    <LocationOffIcon className={classes.placeholderIcon} />
                    <span>No location to display</span>
                </div>
            )}
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
                {!oneShot && !isMeet && (
                    <span className={classes.stat} title="Number of received position updates">
                        {updateCount} update{updateCount === 1 ? '' : 's'}
                    </span>
                )}
                {isMeet && (
                    <span className={classes.stat} title="A meet-up location share">
                        Meet-up
                    </span>
                )}
                {updatedAgo && live && (
                    <span className={classes.stat}>· {updatedAgo}</span>
                )}
                {accuracy !== null && accuracy > 0 && (
                    <span className={classes.stat}>· ±{accuracy}m</span>
                )}
                <span className={classes.spacer} />
                {mine && !ended && !oneShot && onStopShare && (latestLatLng || peerLatLng) && (
                    <button
                        type="button"
                        className={classes.stopBtn}
                        title="Stop sharing your live location"
                        onClick={() => { setJustStopped(true); onStopShare(); }}
                    >
                        <LocationOffIcon className={classes.stopBtnIcon} />
                        Stop sharing
                    </button>
                )}
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

    const handleContextMenu = (e) => {
        e.preventDefault();
        // return
        const { clientX, clientY } = e;
        const virtualElement = {
            clientWidth: 0,
            clientHeight: 0,
            getBoundingClientRect: () => ({
                width: 0,
                height: 0,
                top: clientY,
                right: clientX,
                bottom: clientY,
                left: clientX
            })
        };
        setAnchorEl(virtualElement);
    }

    const _removeMessage = () => {
        if (typeof removeMessage === 'function') {
            {mine && !ended && !oneShot && onStopShare && (latestLatLng || peerLatLng) &&
                setJustStopped(true);
                onStopShare();
            }
            removeMessage();
        }
    }

    const handleClose = () => {
        setAnchorEl(null);
    };

    const menu = (
        <CustomContextMenu
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={handleClose}
            keepMounted={false}
        >
            {mine && !ended && !oneShot && onStopShare && (latestLatLng || peerLatLng) && (
                <MenuItem
                    className={clsx(classes.item, classes.danger)}
                    title="Stop sharing your live location"
                    onClick={() => { setJustStopped(true); onStopShare(); handleClose()}}
                    style={{}}
                >
                    Stop sharing
                </MenuItem>
            )}
            <MenuItem className={classes.item} onClick={() => { _removeMessage(); handleClose() }}>
                Remove
            </MenuItem>
        </CustomContextMenu>
    );

    if (cont) {
        return (
            <Media className={theme} onContextMenu={handleContextMenu}>
                {menu}
                <Media.Left className="timestamp-continued"><span>{time}</span></Media.Left>
                <Media.Body className="vertical-center">
                    {card}
                </Media.Body>
            </Media>
        );
    }

    return (
        <Media className={theme} onContextMenu={handleContextMenu}>
            {menu}
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
