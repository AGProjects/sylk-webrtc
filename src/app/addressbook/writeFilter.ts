import debug from 'debug';
import { contactPayload, origin } from 'blink-addressbook';
import type { Rules } from 'blink-addressbook';

const DEBUG = debug('blinkrtc:addressbook:payload');

type FilterKind = 'contact' | 'policy' | 'group';
type WriteFilter = (kind: FilterKind, item: any, previous: any) => any;

export interface FilterableAddressbook {
    setWriteFilter?: (filter: WriteFilter | null) => void;
}

export interface StampSource {
    deviceId: () => string;
    agent: () => string;
}

export interface WriteFilterOptions {
    stamp?: StampSource;
}

export interface WithReasonOptions {
    keepRealName?: boolean;
}

let writeReason = '';
let writeKeepsRealName = false;

export function withReason<T>(reason: string, fn: () => T, options: WithReasonOptions = {}): T {
    const previousReason = writeReason;
    const previousKeeps = writeKeepsRealName;
    writeReason = reason || '';
    writeKeepsRealName = !!writeReason && options.keepRealName !== false;
    try {
        return fn();
    } finally {
        writeReason = previousReason;
        writeKeepsRealName = previousKeeps;
    }
}

const messageOf = (error: unknown): string => (error instanceof Error ? error.message : String(error));

// getRules() returns the rules of the moment of the write: the ones the addressbook index was built with, so a
// changed "Replace 0 with" applies to the next write.
//
// Returns a function that removes the filter again.
export function installContactPayloadFilter(
    addressbook: FilterableAddressbook | null | undefined,
    getRules: () => Rules,
    options: WriteFilterOptions = {}
): () => void {
    if (!addressbook || typeof addressbook.setWriteFilter !== 'function') {
        DEBUG('[ab] [payload] this sylkrtc has no write filter, contacts are written as the app builds them');
        return () => {};
    }
    const target = addressbook as Required<FilterableAddressbook>;
    const stamp = options.stamp || null;

    target.setWriteFilter((kind, item, previous) => {
        let out = item;

        if (kind === 'contact') {
            try {
                out = contactPayload.forServer(out, previous, getRules(), { keepRealName: writeKeepsRealName });
            } catch (error) {
                DEBUG('[ab] [payload] cannot build contact ' + (item && item.id) + ': ' + messageOf(error));
                out = item;
            }
        }

        if (stamp && (kind === 'contact' || kind === 'group')) {
            try {
                const deviceId = stamp.deviceId();
                if (deviceId) {
                    out = origin.stampPayload(kind, out, previous, {
                        deviceId,
                        agent: stamp.agent(),
                        reason: writeReason
                    });
                    DEBUG('[ab] [origin] stamp ' + kind + ' ' + (item && item.id));
                } else {
                    DEBUG('[ab] [origin] no device id yet, ' + kind + ' ' + (item && item.id) + ' is not stamped');
                }
            } catch (error) {
                DEBUG('[ab] [origin] cannot stamp ' + kind + ' ' + (item && item.id) + ': ' + messageOf(error));
            }
        }

        return out;
    });
    return () => target.setWriteFilter(null);
}

module.exports = { installContactPayloadFilter, withReason };
