import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import config, { updateConfig, configOptions } from './config';
import { resolveConfigUrl, fetchConfigFromUrl, getCachedConfig, cacheConfig } from './configService';
import debug from 'debug';


const DEBUG = debug('blinkrtc:ConfigProvider')

type Config = typeof config;

export const ConfigContext = createContext<Config>(config);

interface ConfigProviderProps {
    children: ReactNode;
    domain?: string;
    onConfigReady?: () => void;
}

const ConfigProvider = ({ children, domain = config.defaultDomain, onConfigReady }: ConfigProviderProps) => {
    const [cfg, setCfg] = useState<Config>(config);

    useEffect(() => {
        if (!domain) return;

        const lookup = async () => {
            try {
                const configUrl = await resolveConfigUrl(domain);
                const serverConfig = await fetchConfigFromUrl(configUrl);
                updateConfig({ ...serverConfig, domain });
                setCfg({ ...config });
                await cacheConfig(domain, serverConfig);
            } catch (err) {
                DEBUG('Config lookup failed, using local defaults: %s', err instanceof Error ? err.message : err);
                const cache = await getCachedConfig(domain) || configOptions;
                updateConfig({ ...cache, domain });
                setCfg({ ...config });
            } finally {
                onConfigReady?.();

            }
        };

        lookup();
    }, [domain]);

    return (
        <ConfigContext.Provider value={cfg}>
            {children}
        </ConfigContext.Provider>
    );
};

ConfigProvider.displayName = 'ConfigProvider';

export const useConfig = () => useContext(ConfigContext);

export default ConfigProvider;
