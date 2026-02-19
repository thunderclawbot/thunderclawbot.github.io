// @ts-check
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './tests',
    timeout: 30000,
    retries: 1,
    use: {
        headless: true,
    },
    webServer: {
        command: 'python3 -m http.server 8093 --bind 127.0.0.1',
        port: 8093,
        reuseExistingServer: true,
    },
});
