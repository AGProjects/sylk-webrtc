import React, { createContext, useContext, useState, useCallback, useEffect, useImperativeHandle, forwardRef, ReactNode } from 'react';
import { AppPreferences, defaultPreferences, preferencesKey } from './types/AppPreferences';
import debug from 'debug';

// storage.js is plain JS (CommonJS) - the app's normal global storage module,
// expected to already be initialized by app.js before this provider mounts.
const storage = require('./storage');

const DEBUG = debug('blinkrtc:PreferencesProvider');

interface PreferencesContextValue {
    preferences: AppPreferences;
    loading: boolean;
    updatePreferences: (patch: Partial<AppPreferences>) => void;
    resetPreferences: () => void;
    zrtpSupported: boolean;
}

export const PreferencesContext = createContext<PreferencesContextValue>({
    preferences: defaultPreferences,
    loading: true,
    zrtpSupported: false,
    updatePreferences: () => {},
    resetPreferences: () => {}
});

const ZRTP_ENCRYPTION_MODE_MAP = {
    off: 'sdes',
    optional: 'zrtp_optional',
    mandatory: 'zrtp_mandatory'
} as const;

interface PreferencesProviderProps {
    children: ReactNode;
    account: any;      // e.g. 'alice@sylk.link' - preferences are keyed per account
}

// Exposed to a parent class component (app.js's Blink) via ref, for reading
// the current preferences synchronously outside of React's render flow -
// same convention as addressbookRef/notificationCenterRef elsewhere in the app.
export interface PreferencesHandle {
    getPreferences: () => AppPreferences;
    getEncryptionMode: () => string;
}

const PreferencesProvider = forwardRef<PreferencesHandle, PreferencesProviderProps>(({ children, account }, ref) => {
    const [preferences, setPreferences] = useState<AppPreferences>(defaultPreferences);
    const [loading, setLoading] = useState<boolean>(true);
    const zrtpSupported = account?.zrtpSupported ?? false;
    useEffect(() => {
        if (!account) return;

        let cancelled = false;
        setLoading(true);

        storage
            .get(preferencesKey(account.id))
            .then((stored: Partial<AppPreferences> | null) => {
                if (cancelled) return;
                setPreferences({ ...defaultPreferences, ...(stored || {}) });
                DEBUG({ ...defaultPreferences, ...(stored || {}) });
            })
            .catch((err: unknown) => {
                DEBUG('Could not load preferences for %s: %s', account, err instanceof Error ? err.message : err);
                if (!cancelled) setPreferences({ ...defaultPreferences });
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [account]);

    const updatePreferences = useCallback(
        (patch: Partial<AppPreferences>) => {
            setPreferences((prev) => {
                const next = { ...prev, ...patch };
                storage.set(preferencesKey(account.id), next).catch((err: unknown) =>
                    DEBUG('Could not persist preferences: %s', err instanceof Error ? err.message : err)
                );
                 if (
                    patch.zrtpMode !== undefined &&
                        patch.zrtpMode !== prev.zrtpMode
                ) {
                    account.encryptionMode = ZRTP_ENCRYPTION_MODE_MAP[patch.zrtpMode];
                }
                return next;
            });
        },
        [account]
    );

    const resetPreferences = useCallback(() => {
        setPreferences({ ...defaultPreferences });
        storage.set(preferencesKey(account.id), defaultPreferences).catch((err: unknown) =>
            DEBUG('Could not persist reset preferences: %s', err instanceof Error ? err.message : err)
        );
    }, [account]);

    // Always reflects the latest `preferences` state, so app.js can call
    // this.preferencesRef.current.getPreferences() synchronously.
    useImperativeHandle(ref, () => ({
        getPreferences: () => preferences,
        getEncryptionMode: () => ZRTP_ENCRYPTION_MODE_MAP[preferences.zrtpMode]
    }), [preferences]);

    return (
        <PreferencesContext.Provider value={{ preferences, loading, zrtpSupported, updatePreferences, resetPreferences }}>
            {children}
        </PreferencesContext.Provider>
    );
});

PreferencesProvider.displayName = 'PreferencesProvider';

export const usePreferences = () => useContext(PreferencesContext);

export default PreferencesProvider;
