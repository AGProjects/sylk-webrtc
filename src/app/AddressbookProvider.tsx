import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    forwardRef,
    useRef,
    useImperativeHandle,
    createContext,
    useContext,
    ReactNode
} from 'react';
import debug from 'debug';
import keyStorage from './keyStorage';
import addressbookStorage from './addressbookStorage';
import { uniqueId } from './utils';

import { usePreferences } from './PreferencesProvider';
import { ContactIndex, contactGroups, contactPayload, queueDecision } from  'blink-addressbook';
import { createAccountRules, cleanReplaceLeadingZero, startAddressbookNotifications, installContactPayloadFilter, withReason, AvatarStore } from './addressbook';

import { AddressbookContextValue, AddressbookState, AddressbookRef, LookupInput } from './types/Addressbook';
import { Connection } from './types/Connection';
import { Contact } from './types/Contact';

const DEBUG = debug('blinkrtc:AddressBookProvider');

export const AddressbookContext = createContext<AddressbookContextValue | null>(null);

const emptyAddressbook = (rules: ReturnType<typeof createAccountRules>): AddressbookState =>
    ({ contacts: new ContactIndex<Contact>(rules), groups: [], contactIds: new Set() });

interface AddressBookProviderProps {
    connection: Connection;
    contactCache?: Map<string, string>;
    onContactRemoved?: any;
    onAddressbookReady?: any;
    originAgent?: string;
    originDeviceId?: string;
    children: ReactNode;
    account: any;
}

type OperationType = 'addContact' | 'deleteContact' | 'updateContact';

interface OperationPayload {
    type: OperationType;
    contactId: string;
    contactData?: Contact;
    base?: string | null;
    queuedAt?: number;
}

const AddressBookProvider = forwardRef<AddressbookRef, AddressBookProviderProps>(
    ({ connection, contactCache = new Map(), account, onContactRemoved, onAddressbookReady, originAgent = '', originDeviceId = '', children }, ref) => {
        const { preferences, loading: preferencesLoading } = usePreferences();

        const leadingZero = (account && !preferencesLoading)
            ? cleanReplaceLeadingZero(preferences.replaceLeadingZero)
            : '';
        const rules = useMemo(() => createAccountRules(leadingZero), [leadingZero]);
        const rulesRef = useRef(rules);
        rulesRef.current = rules;

        const avatars = useMemo(() => new AvatarStore(addressbookStorage), []);

        const [addressbook, setAddressbook] = useState<AddressbookState>(() => emptyAddressbook(rules));
        const isFirstRun = useRef(true);
        const operationQueue = useRef<Map<string, OperationPayload>>(new Map());
        const isReady = connection?.state === 'ready' && account?.addressbookFetched;
        const failedSubscribers = useRef<((err: any) => void)[]>([]);
        const queueLoaded = useRef(false);
        const isInitialLoad = useRef(false);
        const hasServerLoad = useRef(false);
        const notifierRef = useRef<any>(null);   // a heal suppresses and resumes through this later

        const originDeviceIdRef = useRef(originDeviceId);
        originDeviceIdRef.current = originDeviceId;
        const getDeviceId = useCallback((): string => originDeviceIdRef.current || '', []);
        const originAgentRef = useRef(originAgent);
        originAgentRef.current = originAgent;

        const subscribeFailed = useCallback((callback: (err: any) => void) => {
            failedSubscribers.current.push(callback);
            return () => {
                failedSubscribers.current = failedSubscribers.current.filter(cb => cb !== callback);
            };
        }, []);

        const executeOperation = useCallback((payload: OperationPayload) => {
            switch (payload.type) {
                case 'addContact':
                    return () => connection.addressbook.addContact(payload.contactData!);
                case 'deleteContact':
                    return () => connection.addressbook.deleteContact(payload.contactId);
                case 'updateContact':
                    return () => connection.addressbook.updateContact(payload.contactData!);
                default:
                    return () => DEBUG('Unknown operation type', payload.type);
            }
        }, [connection]);

        const flushQueue = useCallback((contacts: any = null) => {
            const ab = connection?.addressbook;
            operationQueue.current.forEach((payload, id) => {
                let decision = 'send';
                try {
                    decision = queueDecision.decide(payload, {
                        current: ab ? ab.getContact(payload.contactId) : null,
                        contacts,
                        rules
                    });
                } catch (e) {
                    decision = 'send';
                }
                if (decision === 'send') {
                    withReason('offline-queue', executeOperation(payload), { keepRealName: payload.base === undefined });
                } else {
                    DEBUG('[ab] [queue] ' + payload.type + ' ' + payload.contactId + ' not replayed: ' + decision
                        + (payload.queuedAt ? ' (queued ' + new Date(payload.queuedAt).toISOString() + ')' : ' (queued by an older build)'));
                }
                operationQueue.current.delete(id); // remove after execution
                saveQueue(); // persist the updated queue
            });
        }, [executeOperation, connection, rules]);

        const saveQueue = () => {
            const serialized = Array.from(operationQueue.current.entries());
            addressbookStorage.set('operationQueue', serialized);
        };

        useEffect(() => {
            DEBUG('Addressbook updated:', addressbook.contacts.size);
        }, [addressbook]);

        const loadAndFlushQueue = useCallback(async (contacts: any = null) => {
            if (!queueLoaded.current) {
                const saved = await addressbookStorage.get('operationQueue');
                if (saved) {
                    const entries: [string, OperationPayload][] = saved;
                    entries.forEach(([id, payload]) => {
                        operationQueue.current.set(id, payload);
                    });
                }
                queueLoaded.current = true;
            }
            flushQueue(contacts);
        }, [flushQueue]);

        const addressbookDataLoaded = useCallback(async () => {
            if (!connection || !connection.addressbook) return;

            if (connection.addressbook.contacts.length > 0) {
                DEBUG('Saving addressbook locally');
                addressbookStorage.set('addressbook', {
                    contacts: connection.addressbook.contacts,
                    groups: connection.addressbook.groups,
                    policies: connection.addressbook.policies
                });
            }

            let contacts = connection.addressbook.contacts;

            const contactMap = new ContactIndex<Contact>(rules);
            const contactIds = new Set<string>();   // the contacts the list can show: they have an address

            for (let contact of contacts) {
                const entry: Contact = { ...contact };
                const uri = entry.defaultUri?.uri;

                const cachedName = isFirstRun.current ? contactPayload.cachedRealName(entry, contactCache, rules) : '';
                if (cachedName) {
                    const oldName = entry.name;
                    entry.name = cachedName;
                    DEBUG(`Will update contact name ${oldName} -> ${entry.name}`);

                    withReason('name-cache', () => connection.addressbook.updateContact(entry));
                }

                entry.key = uri ? await keyStorage.get(uri) : undefined;

                entry.identity = {
                    displayName: entry.name || '',
                    uri: uri || ''
                };
                avatars.decorate(entry);

                for (let uriObj of entry.uris || []) {
                    if (uriObj.type !== 'SIP') {
                        // continue;
                    }
                    contactMap.add(uriObj.uri, entry);
                    contactIds.add(entry.id);
                }
            }
            isFirstRun.current = false;
            if (contacts.length > 0) avatars.prune(new Set(contacts.map((c: Contact) => c.id)));

            setAddressbook({ contacts: contactMap, groups: contactGroups.buildGroups(connection.addressbook.groups, contactIds), contactIds });
            if (isInitialLoad.current) {
                isInitialLoad.current = false;
                await loadAndFlushQueue(contactMap);
                onAddressbookReady?.();
            }
        }, [connection, contactCache, loadAndFlushQueue, onAddressbookReady, rules, avatars]);

        const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

        const addressbookDataUpdated = useCallback(() => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            debounceTimer.current = setTimeout(() => {
                addressbookDataLoaded();
            }, 300);
        }, [addressbookDataLoaded]);

        const addressbookUpdateFailed = useCallback((err: any) => {
            DEBUG('Update failed', err);
            if (err.id) {
                for (const [opId, payload] of operationQueue.current) {
                    if (payload.contactId === err.id) {
                        operationQueue.current.delete(opId);
                        saveQueue();
                        break;
                    }
                }
            }
            failedSubscribers.current.forEach(cb => cb(err));
        }, []);

        const addressbookDataDeleted = useCallback(({ type, data }: { type: string, data: Contact }) => {
            if (type === 'contact') {
                DEBUG('Contact was deleted, removing all data!!!')
//                onContactRemoved?.(data, true);
            }
        }, [onContactRemoved]);

        const refreshRef = useRef(addressbookDataUpdated);
        refreshRef.current = addressbookDataUpdated;

        useEffect(() => {
            const ab = connection?.addressbook;
            if (!ab) return;
            const detach = avatars.attach(ab);
            avatars.load().then(() => refreshRef.current());
            return detach;
        }, [connection, avatars]);

        useEffect(() => { hasServerLoad.current = false; }, [connection]);

        useEffect(() => {
            if (!connection || !connection.addressbook) return;
            return installContactPayloadFilter(connection.addressbook, () => rulesRef.current, {
                stamp: { deviceId: getDeviceId, agent: () => originAgentRef.current || 'Blink Desktop' }
            });
        }, [connection, getDeviceId]);

        useEffect(() => {
            if (!connection || !connection.addressbook) return;

            const onDataLoaded = () => {
                if (!hasServerLoad.current) {
                    hasServerLoad.current = true;
                    isInitialLoad.current = true;
                }
                addressbookDataUpdated();
            };
            connection.addressbook.on('dataLoaded', onDataLoaded);
            connection.addressbook.on('dataCacheLoaded', addressbookDataUpdated);
            connection.addressbook.on('dataUpdated', addressbookDataUpdated);
            connection.addressbook.on('dataDeleted', addressbookDataUpdated);
            connection.addressbook.on('dataUpdateFailed', addressbookUpdateFailed);

            return () => {
                connection.addressbook.off('dataLoaded', onDataLoaded);
                connection.addressbook.off('dataCacheLoaded', addressbookDataUpdated);
                connection.addressbook.off('dataUpdated', addressbookDataUpdated);
                connection.addressbook.off('dataUpdateFailed', addressbookUpdateFailed);
                connection.addressbook.off('dataDeleted', addressbookDataUpdated);
                if (debounceTimer.current) clearTimeout(debounceTimer.current); // missing
            };
        }, [connection, addressbookDataLoaded, addressbookDataUpdated, addressbookUpdateFailed, addressbookDataDeleted]);

        const appliedRules = useRef(rules);
        useEffect(() => {
            if (appliedRules.current === rules) return;
            appliedRules.current = rules;
            addressbookDataUpdated();
        }, [rules, addressbookDataUpdated]);

        useEffect(() => {
            if (!connection || !connection.addressbook || !account) return;
            const handle = startAddressbookNotifications(connection, account, { deviceId: getDeviceId });
            notifierRef.current = handle.notifier;
            return () => {
                handle.stop();
                notifierRef.current = null;
            };
        }, [connection, account, getDeviceId]);

        const setContactGroups = useCallback((contactId: string, keys: string[], names: string[] = []): Promise<void> => {
            const ab = connection?.addressbook;
            if (!ab || !isReady) return Promise.reject(new Error('The addressbook is not ready'));
            const contact = ab.getContact(contactId);
            if (!contact) return Promise.reject(new Error('Unknown contact ' + contactId));

            const writes = contactGroups.planMembership(ab.groups, contact, { keys, names });
            return Promise.all(writes.map(({ action, group }) => new Promise<void>((resolve, reject) => {
                DEBUG('[ab] [groups] %s "%s" (%d members)', action, group.name, group.contacts?.length);
                const done = (err?: any) => (err ? reject(err) : resolve());
                if (action === 'add') ab.addGroup(group, done); else ab.updateGroup(group, done);
            }))).then(() => { addressbookDataLoaded(); });
        }, [connection, isReady, addressbookDataLoaded]);

        const syncKindGroups = useCallback((contact: Contact) => {
            const ab = connection?.addressbook;
            if (!ab || !isReady) return;
            const current = ab.getContact(contact.id) || contact;
            for (const { action, group } of contactGroups.planKindMembership(ab.groups, current, rules)) {
                DEBUG('[ab] [kind groups] %s "%s" (%d members)', action, group.name, group.contacts?.length);
                const done = (err?: any) => { if (err) DEBUG('Filing %s in %s failed: %s', contact.id, group.name, err); };
                if (action === 'add') ab.addGroup(group, done); else ab.updateGroup(group, done);
            }
        }, [connection, isReady, rules]);


        const addContact = useCallback((contact: Contact): Promise<void> => {
            DEBUG('Adding contact: %o, Ready: %s', contact, isReady);
            const queuedBase = queueDecision.baseFor(connection.addressbook.getContact(contact.id));
            return new Promise<void>((resolve, reject) => {
                connection.addressbook.addContact(contact, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                        syncKindGroups(contact);
                    }
                });
                if (!isReady) {
                    const newOperation: OperationPayload = {
                        type: 'addContact',
                        contactId: contact.id,
                        contactData: contact,
                        ...queuedBase
                    };
                    operationQueue.current.set(uniqueId(), newOperation);
                    saveQueue();
                }
                addressbookDataLoaded();
            });
        }, [connection, isReady, addressbookDataLoaded, syncKindGroups]);

        const deleteContact = useCallback((contact: Contact): Promise<void> => {
            const queuedBase = queueDecision.baseFor(connection.addressbook.getContact(contact.id));
            avatars.forget(contact.id);
            return new Promise<void>((resolve, reject) => {
                connection.addressbook.deleteContact(contact.id, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                        syncKindGroups(contact);
                    }
                });
                if (!isReady) {
                    const newOperation: OperationPayload = {
                        type: 'deleteContact',
                        contactId: contact.id,
                        contactData: contact,
                        ...queuedBase
                    };
                    operationQueue.current.set(uniqueId(), newOperation);
                    saveQueue();
                }
            });
        }, [connection, isReady, avatars, syncKindGroups]);

        const updateContact = useCallback((contact: Contact): Promise<void> => {
            const queuedBase = queueDecision.baseFor(connection.addressbook.getContact(contact.id));
            return new Promise<void>((resolve, reject) => {
                connection.addressbook.updateContact(contact, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                        syncKindGroups(contact);
                    }
                });
                if (!isReady) {
                    const newOperation: OperationPayload = {
                        type: 'updateContact',
                        contactId: contact.id,
                        contactData: contact,
                        ...queuedBase
                    };
                    operationQueue.current.set(uniqueId(), newOperation);
                    saveQueue();
                }
                addressbookDataLoaded();
            });
        }, [connection, isReady, addressbookDataLoaded, syncKindGroups]);

        const createContact = (uri: string, name: string): Contact => {
            const uris = [{ uri, id: uniqueId(), default: false, type: 'SIP', attributes: {} }];
            const displayName = name || uri;
            return {
                id: uniqueId(),
                name: displayName,
                uris,
                defaultUri: uris[0],
                identity: { displayName, uri },
                dialog: { policy: 'default', subscribe: false },
                presence: { policy: 'default', subscribe: false },
                attributes: {}
            };
        };

        const lookup = useCallback((input: LookupInput) => {
            const { uri, name } = typeof input === 'string'
                ? { uri: input, name: input }
                : { uri: input.uri, name: input.displayName };

            return addressbook.contacts.best(uri) ?? createContact(uri, name);
        }, [addressbook]);

        const reset = useCallback(() => {
            setAddressbook(emptyAddressbook(rules));
            avatars.clear();
            isFirstRun.current = true;
            hasServerLoad.current = false;
        }, [rules, avatars]);

        const setAvatar = useCallback((contact: Contact, data: string | null, contentType = 'image/jpeg') =>
            updateContact(avatars.withPicture(contact, data, contentType, getDeviceId())),
        [avatars, updateContact, getDeviceId]);

        const contextValue = useMemo<AddressbookContextValue>(() => ({
            addressbook,
            actions: { reload: addressbookDataLoaded, add: addContact, delete: deleteContact, update: updateContact, setAvatar, setGroups: setContactGroups, reset },
            lookup,
            rules,
            onError: subscribeFailed
        }), [addressbook, addressbookDataLoaded, addContact, deleteContact, updateContact, setContactGroups, reset, lookup, rules, subscribeFailed, setAvatar]);

        useImperativeHandle(ref, () => ({
            reset,
            addressbook,
            reload: addressbookDataLoaded,
            add: addContact,
            delete: deleteContact,
            update: updateContact,
            setAvatar,
            setGroups: setContactGroups,
            lookup,
            withReason,
            adoptsDisplayName: (contact: any, displayName: string, senderUri: string): boolean =>
                contactPayload.adoptsDisplayName(contact, displayName, senderUri, rules)
        }), [addressbook, addressbookDataLoaded, addContact, deleteContact, updateContact, setContactGroups, reset, lookup, rules, setAvatar]);
        return (
            <AddressbookContext.Provider value={contextValue}>
                {children}
            </AddressbookContext.Provider>
        );
    }
);

AddressBookProvider.displayName = 'AddressBookProvider';

export const useAddressbook = () => useContext(AddressbookContext);

export default AddressBookProvider;
