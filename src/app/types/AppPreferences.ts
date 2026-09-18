export type ZrtpMode =
    'off' |
    'optional' |
    'mandatory';

export interface AppPreferences {
    theme: 'system' | 'light' | 'dark';
    language: string;

    audioInputDeviceId: string;
    audioOutputDeviceId: string;
    videoInputDeviceId: string;
    echoCancellation: boolean;
    noiseSuppression: boolean;
    autoGainControl: boolean;

    autoAnswer: boolean;
    muteOnJoin: boolean;

    zrtpMode: ZrtpMode;

    notificationsEnabled: boolean;
    notificationSound: boolean;
}

export const defaultPreferences: AppPreferences = {
    theme: 'system',
    language: 'en',

    audioInputDeviceId: 'default',
    audioOutputDeviceId: 'default',
    videoInputDeviceId: 'default',
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,

    autoAnswer: false,
    muteOnJoin: false,

    zrtpMode: 'off',

    notificationsEnabled: true,
    notificationSound: true
};

// Preferences live in the app's normal (global) storage module, namespaced
// by account - same convention as e.g. `pgpKeys-${account}` - rather than a
// dedicated per-account store instance, since this is small data.
export function preferencesKey(account: string): string {
    return `preferences-${account}`;
}

