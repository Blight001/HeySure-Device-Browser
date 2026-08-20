import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const extensionRoot = path.resolve(here, '..');
const aggregateConfig = path.resolve(extensionRoot, '..', '..', 'device.config.json');
const output = path.join(extensionRoot, 'background', '00_device_config.js');
const productionFallback = 'http://49.234.181.190:58150';
const localFallback = 'http://127.0.0.1:3000';

let config = {};
try {
    config = JSON.parse(fs.readFileSync(aggregateConfig, 'utf8'));
} catch (error) {
    if (error && error.code !== 'ENOENT') throw error;
}

const normalize = (value, fallback) => {
    const text = typeof value === 'string' ? value.trim().replace(/\/+$/, '') : '';
    return text || fallback;
};
const production = normalize(config.default_server_url, productionFallback);
const local = normalize(config.local_test_server_url, localFallback);
const source = `// Generated from device/device.config.json by scripts/sync-device-config.mjs.
// Keep production fallback here because a packaged extension cannot read files
// outside its own extension root at runtime.
globalThis.HEYSURE_DEVICE_CONFIG = Object.freeze({
    defaultServerUrl: ${JSON.stringify(production)},
    localTestServerUrl: ${JSON.stringify(local)}
});
`;
fs.writeFileSync(output, source, 'utf8');
console.log(`Synced device defaults to ${output}`);

