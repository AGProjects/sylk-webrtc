'use strict';

let sharedCanvas: HTMLCanvasElement | null = null;
let sharedCtx: CanvasRenderingContext2D | null = null;

export function isBlackFrame(video: HTMLVideoElement | null | undefined): boolean | null {
    if (!video || video.readyState < 2 || !video.videoWidth) return null;

    if (!sharedCanvas || !sharedCtx) {
        sharedCanvas = document.createElement('canvas');
        sharedCanvas.width = 32;
        sharedCanvas.height = 18;
        sharedCtx = sharedCanvas.getContext('2d', { willReadFrequently: true });
        if (!sharedCtx) return null;
    }

    sharedCtx.drawImage(video, 0, 0, sharedCanvas.width, sharedCanvas.height);
    const { data } = sharedCtx.getImageData(0, 0, sharedCanvas.width, sharedCanvas.height);

    let max = 0;
    for (let i = 0; i < data.length; i += 4) {
        const y = (data[i] * 3 + data[i + 1] * 6 + data[i + 2]) / 10;
        if (y > max) max = y;
    }
    return max < 12;
}

export type PresenceState = boolean | null;

export interface VideoPresenceOptions {
    alpha?: number;
    minBitrate?: number;
    minPackets?: number;
    /** opeenvolgende "geen video" samples voor uitzetten */
    holdOff?: number;
    /** opeenvolgende goede samples voor aanzetten na false */
    goodNeeded?: number;
    initial?: PresenceState;
}

export interface VideoPresenceInput {
    bitrate: number | undefined;
    packets: number | undefined;
    video: HTMLVideoElement | null | undefined;
    trustBitrate?: number;
    sharing?: boolean;
}

export default class VideoPresenceDetector {
    private readonly alpha: number;
    private readonly minBitrate: number;
    private readonly minPackets: number;
    private readonly holdOff: number;
    private readonly goodNeeded: number;

    private state: PresenceState;
    private ema = 0;
    private low = 0;
    private good = 0;

    constructor(options: VideoPresenceOptions = {}) {
        this.alpha = options.alpha ?? 0.4;
        this.minBitrate = options.minBitrate ?? 5000;
        this.minPackets = options.minPackets ?? 5;
        this.holdOff = options.holdOff ?? 3;
        this.goodNeeded = options.goodNeeded ?? 2;
        this.state = options.initial ?? null;
    }

    get current(): PresenceState {
        return this.state;
    }

    force(value: PresenceState): void {
        this.state = value;
        this.low = 0;
        this.good = 0;
    }

    firstFrame(video: HTMLVideoElement | null | undefined): PresenceState {
        if (this.state === null && isBlackFrame(video) === false) {
            this.state = true;
        }
        return this.state;
    }

    update({
        bitrate,
        packets,
        video,
        trustBitrate = 100000,
        sharing = false
    }: VideoPresenceInput): PresenceState {
        if (typeof bitrate !== 'number' || !Number.isFinite(bitrate)) return this.state;
        const pkts = packets ?? 0;

        this.ema = (bitrate > 0 && this.ema === 0)
            ? bitrate
            : this.alpha * bitrate + (1 - this.alpha) * this.ema;

        const trusted = sharing || (this.ema > trustBitrate && bitrate > trustBitrate && pkts > this.minPackets);
        const black = trusted ? false : isBlackFrame(video);
        if (black === null) return this.state;

        const live = trusted ||
            (black === false && this.ema > this.minBitrate && pkts > this.minPackets);

        if (live) {
            this.low = 0;
            this.good += 1;
            if (this.state === null || trusted || this.good >= this.goodNeeded) {
                this.state = true;
            }
            return this.state;
        }

        this.good = 0;
        if (this.state === null && black === true) {
            this.state = false;   // bevestigd zwart bij start: direct beslissen
        } else if (this.state !== false && ++this.low >= this.holdOff) {
            this.low = 0;
            this.state = false;
        }
        return this.state;
    }
}
