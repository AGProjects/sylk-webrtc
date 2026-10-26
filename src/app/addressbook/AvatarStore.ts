import { Contact } from '../types/Contact';

interface Picture { etag: string; uri: string }

interface KeyValueStorage {
    get(key: string): Promise<any>;
    set(key: string, value: any): Promise<any>;
}

export default class AvatarStore {
    private pictures = new Map<string, Picture>();
    private saveTimer: ReturnType<typeof setTimeout> | null = null;

    constructor(private storage: KeyValueStorage, private key = 'avatars') {}

    async load(): Promise<void> {
        try {
            const saved = await this.storage.get(this.key);
            if (!Array.isArray(saved)) return;
            for (const [id, p] of saved) if (!this.pictures.has(id)) this.pictures.set(id, p);
        } catch (e) { }
    }

    attach(ab: any): () => void {
        ab.setAvatarCache(() => Array.from(this.pictures, ([id, p]) => ({ id, etag: p.etag })));

        const onAvatars = (list: { id: string; avatar: any; data: string | null }[]) => {
            for (const { id, avatar, data } of list) {
                if (data) {
                    this.pictures.set(id, {
                        etag: avatar.etag || '',
                        uri: `data:${avatar.content_type || avatar.contentType || 'image/jpeg'};base64,${data}`
                    });
                }
            }
            this.save();
        };
        ab.on('avatars', onAvatars);
        return () => { ab.off('avatars', onAvatars); ab.setAvatarCache(null); };
    }

    decorate(entry: Contact) {
        const pic = this.pictures.get(entry.id);
        if (pic && pic.etag && !entry.avatar?.etag) { this.pictures.delete(entry.id); this.save(); }
        entry.avatarUri = this.pictures.get(entry.id)?.uri;
    }

    prune(ids: Set<string>) {
        let changed = false;
        for (const id of this.pictures.keys()) {
            if (!ids.has(id)) { this.pictures.delete(id); changed = true; }
        }
        if (changed) this.save();
    }

    withPicture(contact: Contact, data: string | null, contentType: string, deviceId: string): Contact {
        const { avatarUri, ...rest } = contact;
        if (!data) {
            this.pictures.delete(contact.id);
            this.save();
            return { ...rest, avatar: { remove: true, deviceId } } as Contact;
        }
        this.pictures.set(contact.id, { etag: '', uri: `data:${contentType};base64,${data}` });
        this.save();
        return { ...rest, avatar: { data, contentType, deviceId } } as Contact;
    }

    forget(id: string) { this.pictures.delete(id); this.save(); }
    clear() { this.pictures.clear(); this.save(); }

    private save() {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => {
            try {
                Promise.resolve(this.storage.set(this.key, Array.from(this.pictures))).catch(() => {});
            } catch (e) { /* store nog niet geïnitialiseerd */ }
        }, 1000);
    }
}
