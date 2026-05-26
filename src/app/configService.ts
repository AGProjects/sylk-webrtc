import request from 'superagent';
import debug from 'debug';
import storage from './storage';
import { DnsResponse } from './types/Dns';

const DEBUG = debug('blinkrtc:ConfigService')
const DNS_PRIMARY = 'https://dns.google/resolve';
const DNS_FALLBACK = 'https://mdns.sipthor.net/dnslookup.php';

const isElectron = navigator.userAgent.includes('Electron');

export const resolveConfigUrl = async (domain: string): Promise<string> => {
    if (!isElectron) throw new Error('DNS lookup not supported in browser');

    const primaryUrl = `${DNS_PRIMARY}?name=_sylkserver.${domain}&type=TXT`;
    const fallbackUrl = `${DNS_FALLBACK}?name=_sylkserver.${domain}&type=TXT`;

    const fetchDns = async (url: string): Promise<DnsResponse> => {
        const res = await request.get(url).timeout({ response: 3000 });
        return res.body;
    };

    let data: DnsResponse;
    try {
        data = await fetchDns(primaryUrl);
    } catch {
        DEBUG('Primary DNS failed, trying fallback...');
        data = await fetchDns(fallbackUrl);
    }

    const answers = data.Answer?.map((a: any) => a.data.replace(/^"|"$/g, '')) || [];
    if (!answers.length) throw new Error('No DNS TXT record found');
    DEBUG("Got answer from DNS, config should be at: %s", answers[0])

    return answers[0];
};

export const cacheConfig = async (domain: string, serverConfig: any): Promise<void> => {
    if (!isElectron) return;
    await storage.set(`config-${domain}`, serverConfig);
};

export const getCachedConfig = async (domain: string): Promise<any> => {
    if (!isElectron) return null;
    return await storage.get(`config-${domain}`);
};

export const fetchConfigFromUrl = async (url: string): Promise<any> => {
    const res = await request.get(url).timeout({ response: 3000 });
    if (!res.ok) throw new Error(`Failed to fetch config: ${res.status}`);
    try {
        const data = res.body ?? JSON.parse(res.text);
        DEBUG("Fetched config: %O", data);
        return data;

    } catch {
        throw new Error('Invalid config response: not valid JSON');
    }
};
