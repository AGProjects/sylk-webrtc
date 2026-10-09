import { Contact } from './Contact';
import type { ContactIndex } from 'blink-addressbook';

export type LookupInput = string | { uri: string;[key: string]: any }

export interface AddressbookState {
    contacts: ContactIndex<Contact>;
}

export interface AddressbookActions {
    reload: () => void;
    add: (contact: Contact) => Promise<void>;
    delete: (contact: Contact) => Promise<void>;
    update: (contact: Contact) => Promise<void>;
    reset: () => void;
}

export interface AddressbookRef extends AddressbookActions {
    reset: () => void;
    addressbook: AddressbookState;
}

export interface AddressbookContextValue {
    addressbook: AddressbookState;
    actions: AddressbookActions;
    lookup: (input: LookupInput) => Contact;
    onError: (callback: (err: any) => void) => (() => void);
}

