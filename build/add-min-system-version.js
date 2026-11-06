'use strict';
const fs = require('fs');
const path = require('path');

const outDir = process.argv[2] || 'dist-electron';

// Kernelversies zoals os.release() ze geeft
const minimums = {
    'latest-mac.yml': '22.0.0', // macOS 13 (Darwin 22)
    'latest.yml': '10.0.0'      // Windows 10
};

for (const [file, minimum] of Object.entries(minimums)) {
    const filePath = path.join(outDir, file);
    if (!fs.existsSync(filePath)) {
        console.log(`skip ${file}: not found`);
        continue;
    }
    let text = fs.readFileSync(filePath, 'utf-8');
    if (/^minimumSystemVersion:/m.test(text)) {
        text = text.replace(/^minimumSystemVersion:.*$/m, `minimumSystemVersion: ${minimum}`);
    } else {
        if (!text.endsWith('\n')) { text += '\n'; }
        text += `minimumSystemVersion: ${minimum}\n`;
    }
    fs.writeFileSync(filePath, text);
    console.log(`${file}: minimumSystemVersion ${minimum}`);
}
