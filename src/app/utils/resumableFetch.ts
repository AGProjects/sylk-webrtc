import debug from 'debug';

const DEBUG = debug('blinkrtc:resumableFetch');

// Generic, domain-agnostic resumable download over fetch(). A fixed
// wall-clock deadline (as used by superagent) can't work for large files
// on slow links, so this guards time-to-first-byte and inter-chunk
// silence separately, and resumes broken transfers with a Range request.

const RESPONSE_TIMEOUT = 15000;    // server has this long to start replying
const STALL_TIMEOUT = 60000;       // ...and this long between chunks
const RESUME_ATTEMPTS = 10;        // consecutive failures that made no progress
const RESUME_BACKOFF = 1000;       // multiplied by the attempt number
const PROGRESS_THROTTLE_MS = 100;  // minimum time between progress callbacks

export interface DownloadProgress {
    loaded: number;
    total: number | undefined;
    percent: number;
}

export type OnProgress = (progress: DownloadProgress) => void;

export interface ResumableDownloadOptions {
    onProgress?: OnProgress | null;
}

export interface AbortablePromise<T> extends Promise<T> {
    abort(): void;
}

interface DownloadState {
    received: number;
    total: number | null;
    acceptsRanges: boolean;
    rangeRefused: boolean;
    attempt: number;
}

interface StallTimer {
    arm(ms: number): void;
    disarm(): void;
}

interface HttpError extends Error {
    retryable?: boolean;
}

function httpError(status: number, statusText: string): HttpError {
    const error: HttpError = new Error(`HTTP ${status} ${statusText}`);
    // 4xx (other than 408/429, which are transient) won't succeed on retry --
    // the resource is gone/forbidden/etc, not temporarily unavailable.
    error.retryable = status >= 500 || status === 408 || status === 429;
    return error;
}

// Single-shot timer; re-arming clears any pending fire.
function createStallTimer(onStall: () => void): StallTimer {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return {
        arm(ms: number) {
            if (timer !== null) {
                clearTimeout(timer);
            }
            timer = setTimeout(onStall, ms);
        },
        disarm() {
            if (timer !== null) {
                clearTimeout(timer);
                timer = null;
            }
        }
    };
}

// Throttles progress callbacks. `force` bypasses the throttle -- needed for
// the final update, since total (and therefore "is this the last chunk?")
// isn't always known in advance.
function createProgressEmitter(onProgress: OnProgress | null | undefined) {
    if (!onProgress) {
        return (_loaded: number, _total: number | null, _force = false) => {};
    }
    let lastEmit = 0;
    return (loaded: number, total: number | null, force = false) => {
        const now = Date.now();
        if (!force && now - lastEmit < PROGRESS_THROTTLE_MS) {
            return;
        }
        lastEmit = now;
        onProgress({
            loaded: loaded,
            total: total === null ? undefined : total,
            percent: total ? (loaded / total) * 100 : 0
        });
    };
}

// Reads one response body to completion, resetting the stall timer on
// every chunk. Throws if the stream stalls past STALL_TIMEOUT or is aborted.
async function readBody(
    response: Response,
    stallTimer: StallTimer,
    onChunk: (value: Uint8Array) => void
): Promise<void> {
    const reader = response.body!.getReader();
    for (;;) {
        stallTimer.arm(STALL_TIMEOUT);
        const { done, value } = await reader.read();
        if (done) {
            break;
        }
        onChunk(value);
    }
    stallTimer.disarm();
}

// Downloads `url` into a Blob, resuming with Range requests when the
// connection breaks. Returns a Promise<Blob> with an attached .abort().
export function resumableDownload(url: string, { onProgress = null }: ResumableDownloadOptions = {}): AbortablePromise<Blob> {
    let controller: AbortController | null = null;
    let cancelled = false;

    const emitProgress = createProgressEmitter(onProgress);

    const attemptDownloadWithResume = async (): Promise<Blob> => {
        const chunks: Uint8Array[] = [];
        const state: DownloadState = {
            received: 0,
            total: null,
            acceptsRanges: false,
            rangeRefused: false,
            attempt: 0
        };

        for (;;) {
            if (cancelled) {
                throw new Error('Download cancelled');
            }

            controller = new AbortController();
            const stallTimer = createStallTimer(() => {
                DEBUG('Download of %s: stalled, aborting attempt', url);
                controller!.abort();
            });

            try {
                const headers: Record<string, string> = {};
                if (state.received > 0) {
                    headers.Range = `bytes=${state.received}-`;
                }

                stallTimer.arm(RESPONSE_TIMEOUT);
                const response = await fetch(url, { headers: headers, signal: controller.signal });

                if (state.received > 0) {
                    if (response.status === 200) {
                        // Server ignored Range and resent from byte 0: drop what
                        // we have instead of duplicating a prefix, and mark this
                        // server as non-resumable so the next break is fatal
                        // rather than retrying a full re-download indefinitely.
                        DEBUG('Download of %s: server ignored Range, restarting from 0', url);
                        state.rangeRefused = true;
                        chunks.length = 0;
                        state.received = 0;
                    } else if (response.status !== 206) {
                        throw httpError(response.status, response.statusText);
                    }
                } else if (!response.ok) {
                    throw httpError(response.status, response.statusText);
                }

                if (state.received === 0) {
                    // Accept-Ranges is only advisory (and only visible cross-origin
                    // if exposed); actual resumability is decided by the status
                    // code of the Range request itself, not by this header.
                    state.acceptsRanges = (response.headers.get('accept-ranges') || '').toLowerCase().includes('bytes');
                    const length = parseInt(response.headers.get('content-length') || '', 10);
                    state.total = Number.isFinite(length) ? length : null;
                    emitProgress(0, state.total);
                }

                await readBody(response, stallTimer, (value) => {
                    chunks.push(value);
                    state.received += value.byteLength;
                    state.attempt = 0;      // bytes are flowing again
                    emitProgress(state.received, state.total);
                });
                emitProgress(state.received, state.total, true); // guarantee a final update even when total was unknown

                if (state.total !== null && state.received !== state.total) {
                    // Ended cleanly but short of Content-Length: treat as a break
                    // so the resume path collects the rest.
                    throw new Error(`connection closed at ${state.received}/${state.total} bytes`);
                }

                // Blob accumulation lets the engine spill bytes to disk instead
                // of pinning them all in the JS heap.
                const blob = new Blob(chunks);
                chunks.length = 0;
                return blob;
            } catch (error) {
                stallTimer.disarm();

                if (cancelled) {
                    throw new Error('Download cancelled');
                }

                state.attempt += 1;

                // Stop retrying once the budget is spent, if this server has
                // already shown it won't resume, or if the error is permanent
                // (e.g. 404/403) and retrying it can't ever succeed.
                const retryable = (error as HttpError).retryable !== false;
                if (state.attempt > RESUME_ATTEMPTS || state.rangeRefused || !retryable) {
                    throw error;
                }

                DEBUG('Download of %s broke at %d bytes (%s), retrying in %dms (attempt %d/%d)',
                    url, state.received, (error as Error).message,
                    RESUME_BACKOFF * state.attempt, state.attempt, RESUME_ATTEMPTS);

                await new Promise(resolve => setTimeout(resolve, RESUME_BACKOFF * state.attempt));
            }
        }
    };

    const promise = attemptDownloadWithResume() as AbortablePromise<Blob>;

    promise.abort = () => {
        cancelled = true;
        if (controller !== null) {
            controller.abort();
        }
    };

    return promise;
}
