require('dotenv').config()
const fs = require('fs');
const path = require('path');
const { notarize } = require('@electron/notarize');

module.exports = async function(params) {
    // Only notarize the app on Mac OS only.
    if (params.electronPlatformName !== 'darwin') {
        return;
    }

    if (!process.env.APPLE_ID) {
        console.warn('Cannot find appleId in env to notarize application, skipping notarization');
        return;
    }
    console.log('afterSign hook triggered', params);

    // Same appId in electron-builder.
    let appId = 'com.agprojects.Sylk'

    let appPath = path.join(params.appOutDir, `${params.packager.appInfo.productFilename}.app`);
    if (!fs.existsSync(appPath)) {
        throw new Error(`Cannot find application at: ${appPath}`);
    }

    if (!process.env.APPLE_ID_PASSWORD) {
        throw new Error('Cannot find appleIdPassword in env to notarize application');
    }

    console.log(`Notarizing ${appId} found at ${appPath}`);

    try {
        await notarize({
            appBundleId: appId,
            appPath: appPath,
            appleId: process.env.APPLE_ID,
            appleIdPassword: process.env.APPLE_ID_PASSWORD,
            teamId: process.env.TEAM_ID
        });
    } catch (error) {
        console.error(error);
    }

    console.log(`Done notarizing ${appId}`);
};
