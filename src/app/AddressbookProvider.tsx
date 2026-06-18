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

import { AddressbookContextValue, AddressbookState, AddressbookRef, LookupInput } from './types/Addressbook';
import { Connection } from './types/Connection';
import { Contact } from './types/Contact';


const DEBUG = debug('blinkrtc:AddressBookProvider');

export const AddressbookContext = createContext<AddressbookContextValue | null>(null);

interface AddressBookProviderProps {
    connection: Connection;
    contactCache?: Map<string, string>;
    onContactRemoved?: any;
    onAddressbookReady?: any;
    children: ReactNode;
    account: any;
}

type OperationType = 'addContact' | 'deleteContact' | 'updateContact';

interface OperationPayload {
    type: OperationType;
    contactId: string;
    contactData?: Contact;
}

const AddressBookProvider = forwardRef<AddressbookRef, AddressBookProviderProps>(
    ({ connection, contactCache = new Map(), account, onContactRemoved, onAddressbookReady, children }, ref) => {
        const [addressbook, setAddressbook] = useState<AddressbookState>({
            contacts: new Map()
        });
        const isFirstRun = useRef(true);
        const operationQueue = useRef<Map<string, OperationPayload>>(new Map());
        const isReady = connection?.state === 'ready' && account?.addressbookFetched;
        const failedSubscribers = useRef<((err: any) => void)[]>([]);
        const queueLoaded = useRef(false);
        const isInitialLoad = useRef(false);

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

        const flushQueue = useCallback(() => {
            operationQueue.current.forEach((payload, id) => {
                const opFn = executeOperation(payload);
                opFn();
                operationQueue.current.delete(id); // remove after execution
                saveQueue(); // persist the updated queue
            });
        }, [executeOperation]);

        const saveQueue = () => {
            const serialized = Array.from(operationQueue.current.entries());
            addressbookStorage.set('operationQueue', serialized);
        };

        useEffect(() => {
            DEBUG('Addressbook updated:', addressbook.contacts.size);
        }, [addressbook]);

        const loadAndFlushQueue = useCallback(async () => {
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
            flushQueue();
        }, [flushQueue]);

        const addressbookDataLoaded = useCallback(async () => {
            if (!connection || !connection.addressbook) return;

            if (connection.addressbook.contacts.length > 0) {
                DEBUG('Saving addressbook');
                addressbookStorage.set('addressbook', {
                    contacts: connection.addressbook.contacts,
                    groups: connection.addressbook.groups,
                    policies: connection.addressbook.policies
                });
            }

            let contacts = connection.addressbook.contacts;

            const contactMap = new Map<string, Contact[]>();

            for (let contact of contacts) {
                const entry: Contact = { ...contact };
                const uri = entry.defaultUri?.uri;

                if (isFirstRun.current && entry.name === uri && contactCache.has(uri)) {
                    const oldName = entry.name;
                    entry.name = contactCache.get(uri);
                    DEBUG(`Will update contact name ${oldName} -> ${entry.name}`);

                    connection.addressbook.updateContact(entry);
                }

                entry.key = uri ? await keyStorage.get(uri) : undefined;

                entry.identity = {
                    displayName: entry.name || '',
                    uri: uri || ''
                };

                for (let uriObj of entry.uris || []) {
                    if (uriObj.type !== 'SIP') {
                        // continue;
                    }
                    const existing = contactMap.get(uriObj.uri) || [];
                    existing.push(entry);
                    contactMap.set(uriObj.uri, existing);
                }
            }
            isFirstRun.current = false;
            setAddressbook({ contacts: contactMap });
            if (isInitialLoad.current) {
                isInitialLoad.current = false;
                await loadAndFlushQueue();
                onAddressbookReady?.();
            }
        }, [connection, contactCache, loadAndFlushQueue, onAddressbookReady]);

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
        }, [onContactRemoved])

        useEffect(() => {
            if (!connection || !connection.addressbook) return;

            const onDataLoaded = () => {
                isInitialLoad.current = true;
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

        const addContact = useCallback((contact: Contact): Promise<void> => {
            DEBUG('Adding contact: %o, Ready: %s', contact, isReady);
            return new Promise<void>((resolve, reject) => {
                connection.addressbook.addContact(contact, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
                if (!isReady) {
                    const newOperation: OperationPayload = {
                        type: 'addContact',
                        contactId: contact.id,
                        contactData: contact
                    };
                    operationQueue.current.set(uniqueId(), newOperation);
                    saveQueue();
                }
                addressbookDataLoaded();
            });
        }, [connection, isReady, addressbookDataLoaded]);

        const deleteContact = useCallback((contact: Contact): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
                connection.addressbook.deleteContact(contact.id, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
                if (!isReady) {
                    const newOperation: OperationPayload = {
                        type: 'deleteContact',
                        contactId: contact.id,
                        contactData: contact
                    };
                    operationQueue.current.set(uniqueId(), newOperation);
                    saveQueue();
                }
            });
        }, [connection, isReady]);

        const updateContact = useCallback((contact: Contact): Promise<void> => {
            return new Promise<void>((resolve, reject) => {
                connection.addressbook.updateContact(contact, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
                if (!isReady) {
                    const newOperation: OperationPayload = {
                        type: 'updateContact',
                        contactId: contact.id,
                        contactData: contact
                    };
                    operationQueue.current.set(uniqueId(), newOperation);
                    saveQueue();
                }
                addressbookDataLoaded();
            });
        }, [connection, isReady, addressbookDataLoaded]);

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

            const contactsForUri = addressbook.contacts.get(uri) ?? [];

            if (contactsForUri.length === 0) return createContact(uri, name);

            return contactsForUri.length > 1
                ? contactsForUri.find(c => c.defaultUri?.uri === uri) ?? contactsForUri[0]
                : contactsForUri[0];
        }, [addressbook]);

        const reset = useCallback(() => {
            setAddressbook({ contacts: new Map() });
            isFirstRun.current = true;
        }, []);

        const contextValue = useMemo<AddressbookContextValue>(() => ({
            addressbook,
            actions: { reload: addressbookDataLoaded, add: addContact, delete: deleteContact, update: updateContact, reset },
            lookup,
            onError: subscribeFailed
        }), [addressbook, addressbookDataLoaded, addContact, deleteContact, updateContact, reset, lookup, subscribeFailed]);

        useImperativeHandle(ref, () => ({
            reset,
            addressbook,
            reload: addressbookDataLoaded,
            add: addContact,
            delete: deleteContact,
            update: updateContact,
            lookup
        }), [addressbook, addressbookDataLoaded, addContact, deleteContact, updateContact, reset, lookup]);
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
