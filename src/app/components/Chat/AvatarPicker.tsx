import React, { useRef, useState } from 'react';
import debug from 'debug';
import { Button } from '../../MaterialUIAsBootstrap';

import { useAddressbook } from '../../AddressbookProvider';
import AvatarCropModal from '../AvatarCropModal';
import { Contact } from '../../types/Contact';

const DEBUG = debug('blinkrtc:AvatarPicker');

interface AvatarPickerProps {
    contact: Contact;
    editable: boolean;
    children: (open: (() => void) | undefined) => React.ReactNode;
}

const AvatarPicker = ({ contact, editable, children }: AvatarPickerProps) => {
    const input = useRef<HTMLInputElement>(null);
    const [file, setFile] = useState<File | null>(null);
    const [busy, setBusy] = useState(false);
    const ab = useAddressbook();

    const pick = (e: React.ChangeEvent<HTMLInputElement>) => {
        const chosen = e.target.files?.[0] ?? null;
        e.target.value = '';
        if (chosen && chosen.type.startsWith('image/')) setFile(chosen);
    };

    const save = async (data: string, contentType: string) => {
        if (!ab) return;
        try {
            await ab.actions.setAvatar(contact, data, contentType);
            setFile(null);
        } catch (error) {
            DEBUG('Cannot set avatar: %o', error);
        }
    };

    const remove = async () => {
        if (!ab) return;
        setBusy(true);
        try {
            await ab.actions.setAvatar(contact, null);
        } catch (error) {
            DEBUG('Cannot remove avatar: %o', error);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div style={{ alignSelf: 'center', textAlign: 'center' }}>
            <input ref={input} type="file" accept="image/*" style={{ display: 'none' }} onChange={pick} />
            {children(editable ? () => input.current?.click() : undefined)}
            {editable && (
                <div style={{
                    marginTop: 6, fontFamily: 'inherit', fontSize: 12, color: '#666'
                }}>
                    {contact.avatarUri
                        ? 'Only you will see this photo.'
                        : `Replace ${contact.name || 'this contact'}'s photo with one only you will see.`}
                </div>
            )}
            {editable && contact.avatarUri && (
                <div style={{fontFamily: 'inherit'}}>
                    <Button size="small" disabled={busy} onClick={remove}>Reset photo to original</Button>
                </div>
            )}
            <AvatarCropModal show={!!file} file={file} close={() => setFile(null)} onConfirm={save} />
        </div>
    );
};

export default AvatarPicker;
