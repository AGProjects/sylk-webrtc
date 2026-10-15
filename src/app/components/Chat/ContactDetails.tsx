import React, { useState, useEffect, useMemo, forwardRef, useCallback, useImperativeHandle } from 'react';

import { Paper } from '@material-ui/core';
import { Alert, AlertTitle } from '@material-ui/lab';
import { makeStyles, Theme } from '@material-ui/core/styles';

import { Button } from '../../MaterialUIAsBootstrap';
import ContactDeleteModal from '../ContactDeleteModal';
import ContactDetailName from './ContactDetailName';
import ContactDetailUriList from './ContactDetailUriList';
import ContactDetailGroups, { GroupsForm, groupsOf, groupsChanged } from './ContactDetailGroups';

import { useAddressbook } from '../../AddressbookProvider';
import { uniqueId } from '../../utils';

import { Contact, ContactURI } from '../../types/Contact';

interface ContactDetailsProps {
    contact: Contact;
    editContact: boolean;
    setEdit: (value: boolean) => void;
    onError: (hasError: boolean) => void;
    notificationCenter: any;
    removeChat: any;
}

const useStyles = makeStyles((theme: Theme) => ({
    alertError: {
        backgroundColor: '#f2dede',
        color: '#a94442',
        border: '1px solid #ebccd1',
        borderRadius: '4px',
        padding: '8px 16px',
        fontFamily: 'inherit',
        fontSize: '14px',
        lineHeight: '1.42857143'
    },
    alertTitle: {
        color: '#a94442',
        fontFamily: 'inherit',
        fontSize: '14px'
    }
}));

type AddressbookContext = ReturnType<typeof useAddressbook>;

const ContactDetails = forwardRef<{ save: () => Promise<boolean> }, ContactDetailsProps>(
    ({ contact, editContact, setEdit, onError, notificationCenter, removeChat}, ref) => {
        const initFormContact = (contact: Contact) => {
            const uris = [...(contact.uris ?? [])];
            if (!uris.length || uris[uris.length - 1].uri !== '') {
                uris.push({ uri: '', id: uniqueId(), default: false, type: 'SIP' });
            }
            return { ...contact, uris };
        };

        const [formContact, setFormContact] = useState(() => initFormContact(contact));
        const [error, setError] = useState(null);
        const [showDeleteModel, setShowDeleteModel] = useState(false);
        const { addressbook, actions, onError: onContextError }: AddressbookContext = useAddressbook();
        const classes = useStyles();

        const onServer = !contact._isNew && addressbook.contactIds.has(contact.id);
        const savedGroups = useMemo(() => groupsOf(addressbook.groups, contact.id), [addressbook.groups, contact.id]);
        const [formGroups, setFormGroups] = useState<GroupsForm>(savedGroups);

        const handleSave = useCallback(() => {
            const urisToSave = formContact.uris.filter(u => u.uri.trim() !== '');
            if (urisToSave.length === 0) return Promise.resolve(false);

            const normalize = (uris: ContactURI[]) => uris.map(u => ({ uri: u.uri, default: u.default, type: u.type }));
            const urisChanged = JSON.stringify(normalize(urisToSave)) !== JSON.stringify(normalize(contact.uris));
            const nameChanged = formContact.name !== contact.name;
            const groupsDirty = onServer && groupsChanged(formGroups, savedGroups);

            if (!urisChanged && !nameChanged && !groupsDirty) {
                setError('');
                setFormContact(initFormContact(contact));
                setFormGroups(savedGroups);
                return Promise.resolve(false);
            }
            const saveContact = (urisChanged || nameChanged)
                ? actions.update({ ...formContact, uris: urisToSave })
                : Promise.resolve();
            return saveContact
                .then(() => groupsDirty ? actions.setGroups(contact.id, formGroups.keys, formGroups.newNames) : undefined)
                .then(() => {
                    setError(null);
                    return false;
                })
                .catch((err) => {
                    setError({ id: contact.id, error: err?.message || String(err) });
                    return true;
                });
        }, [formContact, formGroups, savedGroups, onServer, contact, actions]);

        useImperativeHandle(ref, () => ({
            save: handleSave
        }), [handleSave]);

        useEffect(() => {
            const unsubscribe = onContextError((err) => {
                if (err.action === 'delete') {
                    setShowDeleteModel(false);
                    notificationCenter().postDeleteContactFailed(err);
                } else {
                    setError(err);
                }
            });
            return unsubscribe;
        }, [onContextError, notificationCenter]);


        useEffect(() => {
            if (!editContact) {
                setFormGroups(savedGroups);
            }
        }, [savedGroups, editContact]);

        useEffect(() => {
            if (!editContact) {
                setFormContact(prev => {
                    const newForm = initFormContact(contact);
                    return JSON.stringify(newForm) !== JSON.stringify(prev) ? newForm : prev;
                });
            }
        }, [contact, editContact]);

        const onConfirm = () => {
            removeChat(contact, true);

            if (contact._isNew) {
                return;
            }

            actions.delete(contact).
                then(() => {
                    setShowDeleteModel(false);
                })
                .catch((err) => {
                    notificationCenter().postDeleteContactFailed({ error: err });
                    setShowDeleteModel(false);
                })
        };

        return (
            <React.Fragment>
                {error && error.id === contact.id &&
                    <Paper elevation={0} style={{ marginTop: '20px' }}>
                        <Alert severity="error" className={classes.alertError}>
                            <AlertTitle className={classes.alertTitle}>Contact save failed</AlertTitle>
                            {error.error ?? 'Unknown error'}
                        </Alert>
                    </Paper>
                }
                <ContactDetailName
                    contact={contact}
                    formContact={formContact}
                    editContact={editContact}
                    onChange={(name) => setFormContact({ ...formContact, name })}
                    onSubmit={() => { handleSave(); setEdit(false); }}
                />
                <ContactDetailUriList
                    formContact={formContact}
                    editContact={editContact}
                    onChange={setFormContact}
                    onError={onError}
                    onSubmit={() => { handleSave(); setEdit(false); }}
                    key="urilist"
                />
                {onServer &&
                    <ContactDetailGroups
                        contactId={contact.id}
                        groups={addressbook.groups}
                        editContact={editContact}
                        value={formGroups}
                        onChange={setFormGroups}
                    />
                }
                {editContact &&
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16, marginLeft: 8, marginRight: 8}}>
                        <Button disableElevation variant="outlined" color="secondary" size="large" onClick={() => setShowDeleteModel(true)} style={{ flex: 1 }}>Delete Contact</Button>
                    </div>
                }
                <ContactDeleteModal
                    show={showDeleteModel}
                    close={() => setShowDeleteModel(false)}
                    contact={contact}
                    onConfirm={onConfirm}
                />
            </React.Fragment>
        )
    });

ContactDetails.displayName = 'ContactDetails';

export default ContactDetails;
