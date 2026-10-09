/*
 * The shared addressbook rules bound to this client's account: its domain, its
 * conference bridge and the PSTN dial plan from the live config, plus the
 * "Replace 0 with" preference, which is GIVEN, not stored here. No module
 * state: a new preference value is a new rules object, and an index built with
 * one carries it, so the keys it was built with and the keys it is asked for
 * can never disagree.
 */

import { createRules } from 'blink-addressbook';
import type { PstnRules, Rules } from 'blink-addressbook';

// What this file reads of config.js (read at call time: the domain changes when an account signs in).
interface AppConfig {
    domain?: string;
    defaultDomain?: string;
    defaultConferenceDomain?: string;
    pstn?: { rules?: PstnRules | null } | null;
}

const config: AppConfig = require('../config');

export const DEFAULT_PSTN_RULES: Readonly<PstnRules> = Object.freeze({ replacePlus: '00' });

// Digits only, at most 8, as sylk-mobile's Preferences input accepts.
export function cleanReplaceLeadingZero(value?: unknown): string {
    return String(value == null ? '' : value).replace(/[^0-9]/g, '').slice(0, 8);
}

export function createAccountRules(replaceLeadingZero: unknown = ''): Rules {
    const zero = cleanReplaceLeadingZero(replaceLeadingZero);
    return createRules({
        // The account's own domain once one is signed in, the configured default before that.
        get defaultDomain() { return config.domain || config.defaultDomain; },
        get defaultConferenceDomain() { return config.defaultConferenceDomain; },
        get pstnRules(): PstnRules {
            const pstn = (config.pstn && typeof config.pstn === 'object') ? config.pstn : null;
            const rules = (pstn && pstn.rules && typeof pstn.rules === 'object') ? pstn.rules : DEFAULT_PSTN_RULES;
            // only when set, so the rules' own `typeof === 'string'` tests read as "enabled"
            return zero ? Object.assign({}, rules, { replaceLeadingZero: zero }) : rules;
        }
    });
}
