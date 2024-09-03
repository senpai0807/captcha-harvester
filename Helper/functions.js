import fs from 'graceful-fs';
import { app } from 'electron';
import { promisify } from 'util';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { fileURLToPath } from "url";
import { dirname, join } from 'path';
import checkpointSites from './sites.js';
import { fetchCaptchaWindow } from './captchaWindow.js';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const __dirname = dirname(fileURLToPath(import.meta.url));

async function initCaptchaServer() {
    const port = "4077";
    const server = createServer();
    const io = new Server(server);

    await new Promise((resolve, reject) => {
        server.listen(port, (err) => {
            if (err) {
                return reject(err);
            }
            console.log(`Captcha Server is listening on port 4077`);
            resolve();
        });
    });

    io.on('connection', (socket) => {
        const captchaWindow = fetchCaptchaWindow();
        socket.on('open-captcha-harvester', (captchaId) => {
            if (app.isReady()) {
                const { initCaptchaWindow } = require('../main');
                initCaptchaWindow(captchaId);
            } else {
                app.on('ready', () => {
                    const { initCaptchaWindow } = require('../main');
                    initCaptchaWindow(captchaId);
                });
            }
        });
        socket.on('trigger-captcha', async (site, siteKey) => {
            if (captchaWindow) {
                checkpointSites[site] = siteKey;
                await writeFile(
                    join(__dirname, './sites.js'),
                    `const checkpointSites = ${JSON.stringify(checkpointSites, null, 4)};\n\nexport default checkpointSites;`
                );

                captchaWindow.loadURL(site);
            } else {
                console.error('Captcha window is not available.');
            }
        });
        socket.on('send-captcha', (token) => {
            console.log(token);
            captchaWindow.loadURL('file://' + join(__dirname, '../Frontend/captcha.html'));
        });
        socket.on('close-captcha-harvester', (token) => {
            if (captchaWindow) {
                captchaWindow.close();
            }
        });
    });

    server.on('error', async (error) => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        startSocketServer();
    });

    server.on('close', () => {
        startSocketServer();
    });
};

export {
    initCaptchaServer
};