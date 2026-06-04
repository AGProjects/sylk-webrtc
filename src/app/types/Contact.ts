export interface ContactURI {
    uri: string;
    id: string;
    default: boolean;
    type?: string;
    attributes?: any;
}

export interface Contact {
    id: string;
    uris: ContactURI[]
    name?: string;
    message?: {
        state?: string;
        dispositionState?: string;
        dispositionNotification?: string[];
        content?: string;
        timestamp?: number;
    };
    defaultUri?: ContactURI;
    key?: any;
    identity?: { displayName: string; uri: string };
    dialog?: any;
    presence?: any;
    attributes?: any;
}
