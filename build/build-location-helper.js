const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const outDir = path.join(__dirname, '..', 'resources');
const bundleDir = path.join(outDir, 'Blink Desktop Helper (Location).app');
const contentsDir = path.join(bundleDir, 'Contents');
const macOSDir = path.join(contentsDir, 'MacOS');
const executableName = 'blink-location-helper';
const executablePath = path.join(macOSDir, executableName);
const srcFile = path.join(__dirname, 'location-helper.swift');
const tmpDir = path.join(os.tmpdir(), 'location-helper-build');

// Reuse the app's existing bundle identifier so this helper is clearly
// associated with the parent app rather than looking like a random tool.
const BUNDLE_ID = 'com.agprojects.Sylk.location-helper';

function fail(message) {
    console.error('\n\x1b[31m✖ location-helper build failed\x1b[0m');
    console.error(message);
    process.exit(1);
}

// Skip entirely on non-macOS platforms (e.g. Windows/Linux CI runners)
if (process.platform !== 'darwin') {
    console.log('Skipping location-helper build (not on macOS)');
    process.exit(0);
}

// Check that swiftc is available before attempting anything else
try {
    const version = execSync('xcrun swiftc --version', { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
    console.log(`Found swiftc:\n${version}`);
} catch (err) {
    fail(
        'swiftc was not found on this system.\n\n' +
        'The location-helper requires the Swift compiler, which ships with the\n' +
        'Xcode Command Line Tools. Install it with:\n\n' +
        '    xcode-select --install\n\n' +
        'and re-run the build. If Xcode CLT is already installed but this still\n' +
        'fails, check that the license has been accepted:\n\n' +
        '    sudo xcodebuild -license accept\n'
    );
}

// Check that the source file exists
if (!fs.existsSync(srcFile)) {
    fail(`Source file not found: ${srcFile}`);
}

// Clean and recreate the bundle + tmp directories
if (fs.existsSync(bundleDir)) {
    fs.rmSync(bundleDir, { recursive: true, force: true });
}
if (fs.existsSync(tmpDir)) {
    fs.rmSync(tmpDir, { recursive: true, force: true });
}
fs.mkdirSync(macOSDir, { recursive: true });
fs.mkdirSync(tmpDir, { recursive: true });
const resourcesDir = path.join(contentsDir, 'Resources');
fs.mkdirSync(resourcesDir, { recursive: true });
fs.copyFileSync(
    path.join(__dirname, 'icon.icns'),
    path.join(resourcesDir, 'icons.icns')
);
// Compile per-architecture, then merge into a universal binary with lipo
const archs = ['arm64', 'x86_64'];
const archOutputs = [];

for (const arch of archs) {
    const archOutFile = path.join(tmpDir, `location-helper-${arch}`);
    console.log(`Compiling location-helper for ${arch}...`);
    try {
        execSync(
            `swiftc -O -target ${arch}-apple-macos11.0 "${srcFile}" -o "${archOutFile}"`,
            { stdio: 'inherit' }
        );
    } catch (err) {
        fail(`swiftc compilation failed for architecture ${arch}. See output above for details.`);
    }
    if (!fs.existsSync(archOutFile)) {
        fail(`Compilation appeared to succeed for ${arch} but the output is missing: ${archOutFile}`);
    }
    archOutputs.push(archOutFile);
}

console.log('Creating universal binary with lipo...');
try {
    execSync(`lipo -create ${archOutputs.map(f => `"${f}"`).join(' ')} -output "${executablePath}"`, { stdio: 'inherit' });
} catch (err) {
    fail('lipo failed to create the universal binary. See output above for details.');
}

if (!fs.existsSync(executablePath)) {
    fail(`lipo appeared to succeed but the output is missing: ${executablePath}`);
}

try {
    fs.chmodSync(executablePath, 0o755);
} catch (err) {
    fail(`Could not set execute permission on ${executablePath}: ${err.message}`);
}

// Verify both architectures are present
try {
    const archInfo = execSync(`lipo -archs "${executablePath}"`).toString().trim();
    console.log(`Universal binary architectures: ${archInfo}`);
    if (!archInfo.includes('arm64') || !archInfo.includes('x86_64')) {
        fail(`Expected both arm64 and x86_64 in the universal binary, got: ${archInfo}`);
    }
} catch (err) {
    fail(`Could not verify architectures of ${executablePath}: ${err.message}`);
}

// Write Info.plist so CoreLocationAgent has a real bundle identity to
// build the permission prompt UI around (name, etc). A bare Mach-O
// executable with no bundle around it gets silently denied without
// ever showing a prompt on modern macOS.
const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>${executableName}</string>
    <key>CFBundleIdentifier</key>
    <string>${BUNDLE_ID}</string>
    <key>CFBundleName</key>
    <string>Blink Desktop</string>
    <key>CFBundleDisplayName</key>
    <string>Blink Desktop</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleIconFile</key>
    <string>icons.icns</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>LSMinimumSystemVersion</key>
    <string>11.0</string>
    <key>LSUIElement</key>
    <true/>
    <key>NSLocationUsageDescription</key>
    <string>This app needs access to your location to share it when you choose to.</string>
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>This app needs access to your location to share it when you choose to.</string>
</dict>
</plist>
`;

fs.writeFileSync(path.join(contentsDir, 'Info.plist'), infoPlist);

// Clean up tmp dir
fs.rmSync(tmpDir, { recursive: true, force: true });

console.log(`\x1b[32m✔\x1b[0m location-helper.app (universal) built at ${bundleDir}`);
