export interface Contact {
    id: string;
    uri?: string;
    displayName?: string;
    message?: {
        state?: string;
        dispositionState?: string;
        dispositionNotification?: string[];
        content?: string;
        timestamp?: number;
    };
}

