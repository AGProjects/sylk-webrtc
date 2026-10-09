/*
 * Connects the lib's notifier to sylkrtc for this client. The lib knows the rules
 * of the tick, sylkrtc knows how to talk to the server; this is the only place
 * that knows both. A client that does not want addressbook notifications does
 * not call it, and sylkrtc is unchanged for it.
 *
 *     const handle = startAddressbookNotifications(connection, account);
 *     ...
 *     handle.stop();
 *     handle.notifier?.suppress() / .resume()   // around an automatic repair (heal)
 */

import debug from 'debug';
import { AddressbookNotifier, notify } from 'blink-addressbook';
import type { NotifierOptions } from 'blink-addressbook';

const DEBUG = debug('blinkrtc:addressbook:notify');

// sylkrtc has no types of its own here: these describe only what this file uses of it.
type Listener = (...args: any[]) => void;

interface NotifiableAddressbook {
    on(event: string, listener: Listener): unknown;
    off(event: string, listener: Listener): unknown;
    refresh: (done: (error?: unknown) => void) => void;
}

interface IncomingMessage {
    contentType?: string;
    content?: string;
    sender?: string;
    source?: string;
}

export interface NotifiableAccount {
    id: string;
    localDeviceId?: string | null;
    generateDeviceId?: () => string;
    setMessageFilter: (filter: ((message: IncomingMessage) => boolean) | null) => void;
    sendMessage(to: string, content: string, contentType: string, options?: Record<string, unknown>): unknown;
}

export interface NotifiableConnection {
    addressbook?: any;
}

interface WriteStartedEvent {
    writeId: string | number;
    accountId: string;
    type: string;
    data?: { id?: string; groupId?: string };
}

interface WriteFinishedEvent {
    writeId: string | number;
    error?: unknown;
}

export interface AddressbookNotificationsHandle {
    // null when this sylkrtc has no hooks and notifications are off
    notifier: AddressbookNotifier | null;
    stop(): void;
}

// What kind of change a sylkrtc addressbook write is, as the notifier counts it.
// Policies are not announced.
const KIND: Record<string, 'contact' | 'group'> = { contact: 'contact', group: 'group', groupMember: 'group' };

const sameAccount = (uri: unknown, accountId: unknown): boolean =>
    String(uri || '').trim().toLowerCase() === String(accountId || '').trim().toLowerCase();

const NOOP: AddressbookNotificationsHandle = Object.freeze({ notifier: null, stop() {} });

export function startAddressbookNotifications(
    connection: NotifiableConnection | null | undefined,
    account: NotifiableAccount | null | undefined,
    overrides: Partial<NotifierOptions> = {}
): AddressbookNotificationsHandle {
    const book: NotifiableAddressbook | undefined = connection ? connection.addressbook : undefined;

    // Needs the generic hooks from sylkrtc (setMessageFilter, refresh, the write events, sendMessage's
    // `untracked`). They arrive together; without them a tick would travel as an ordinary chat message,
    // so do nothing at all.
    if (!book || !account || typeof account.setMessageFilter !== 'function' || typeof book.refresh !== 'function') {
        DEBUG('[ab] [notify] this sylkrtc has no message filter / refresh, notifications are off');
        return NOOP;
    }

    const notifier = new AddressbookNotifier({
        // the id the app already keeps for zRTP; generated (and announced to the app) if it has none
        deviceId: () => account.localDeviceId || (account.generateDeviceId ? account.generateDeviceId() : ''),
        log: (line) => DEBUG(line),
        // to our own address, so it forks to our other devices; nothing keeps or shows it
        sendTick: (payload) => account.sendMessage(account.id, payload, notify.CONTENT_TYPE,
            { skipJournal: true, skipDisposition: true, cleartext: true, untracked: true }),
        fetch: (done) => book.refresh(done),
        ...overrides
    });

    // sylkrtc tells us when a write leaves and when the server has answered it
    const open = new Map<string | number, (error?: unknown) => void>();
    const onStarted: Listener = ({ writeId, accountId, type, data }: WriteStartedEvent) => {
        DEBUG('[ab] [notify] write start ' + type + ' ' + writeId);
        if (!sameAccount(accountId, account.id) || !KIND[type]) return;
        const id = type === 'groupMember' ? data && data.groupId : data && data.id;
        open.set(writeId, notifier.writeStarted(KIND[type], id));
    };
    const onFinished: Listener = ({ writeId, error }: WriteFinishedEvent) => {
        DEBUG('[ab] [notify] write finish ' + writeId + (error ? ' (error)' : ''));
        const finish = open.get(writeId);
        if (!finish) return;
        open.delete(writeId);
        finish(error);
    };
    book.on('writeStarted', onStarted);
    book.on('writeFinished', onFinished);

    // ticks never reach the rest of the app; only our own account may make us refetch,
    // and a tick replayed from the journal is stale by definition
    account.setMessageFilter((message) => {
        if (message.contentType !== notify.CONTENT_TYPE) return false;
        if (message.source !== 'journal' && sameAccount(message.sender, account.id)) {
            notifier.receive({ content: message.content });
        }
        return true;
    });

    return {
        notifier,
        stop() {
            book.off('writeStarted', onStarted);
            book.off('writeFinished', onFinished);
            account.setMessageFilter(null);
            notifier.dispose();
            open.clear();
        }
    };
}

export default startAddressbookNotifications;
