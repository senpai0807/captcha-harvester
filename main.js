import os from 'os';
import fs from 'graceful-fs';
import is from 'electron-is';
import { promisify } from 'util';
import { fileURLToPath } from "url";
import { dirname, join } from 'path';
import ProxyChain from 'proxy-chain';
import { app, BrowserWindow, session, net } from "electron";
import checkpointSites from './Helper/sites.js';
import { initCaptchaServer } from "./Helper/functions.js";
import { fetchCaptchaWindow, setCaptchaWindow } from "./Helper/captchaWindow.js";

let captchaWindow = null;
const access = promisify(fs.access);
const readFile = promisify(fs.readFile);
const __dirname = dirname(fileURLToPath(import.meta.url));

const initCaptchaWindow = async (captchaId) => {
    if (fetchCaptchaWindow()) {
        fetchCaptchaWindow().focus();
        return;
    };

    const partitionsPath = is.production()
        ? join(os.homedir(), 'AppData', 'Roaming', 'captchaharvester', 'Partitions')
        : join(os.homedir(), 'AppData', 'Roaming', 'Electron', 'Partitions');
    const captchaPath = join(os.homedir(), 'Captcha Harvester', 'captcha.json');
    const data = await readFile(captchaPath, 'utf8');
    const captchaGroups = JSON.parse(data);
    const captchaGroup = captchaGroups.find(g => g.id === captchaId);
    const partitionName = `persist:captchaHarvester_${captchaId}`;
    const partitionPath = join(partitionsPath, `captcha_${captchaId}`);
    const harvesterSession = session.fromPartition(partitionName, { cache: partitionPath });

    if (!captchaGroup) {
        console.error('Captcha group not found');
        return;
    }
    
    let proxyRule = '';
    if (captchaGroup.proxy) {
        const [ip, port, user, pass] = captchaGroup.proxy.split(':');
        const proxyUrl = `http://${user}:${pass}@${ip}:${port}`;
        const proxyAgent = await ProxyChain.anonymizeProxy(proxyUrl);
        proxyRule = `https=${proxyAgent};http=${proxyAgent};direct://`;
    };

    captchaWindow = new BrowserWindow({
        width: 350,
        height: 550,
        alwaysOnTop: true,
        backgroundColor: '#0E0F16',
        webPreferences: {
            webSecurity: false,
            nodeIntegration: true,
            contextIsolation: false,
            partition: partitionName,
            allowRunningInsecureContent: true
        },
        frame: false,
        resizable: false,
        maximizable: false,
        minimizable: false,
        icon: join(__dirname, "./Frontend/Assets/icon.png"),
    });

    setCaptchaWindow(captchaWindow);
    captchaWindow.setMenu(null);
    captchaWindow.webContents.openDevTools();
    captchaWindow.webContents.session.setProxy({
        mode: 'fixed_servers',
        proxyRules: proxyRule,
    }).then(() => {
        captchaWindow.loadURL('file://' + join(__dirname, './Frontend/captcha.html'));
    }).catch(err => {
        console.error('Error setting proxy:', err);
        captchaWindow.loadURL('file://' + join(__dirname, './Frontend/captcha.html'));
    });

    captchaWindow.loadURL('file://' + join(__dirname, './Frontend/captcha.html'));
    captchaWindow.on('close', function () {
        setCaptchaWindow(null);
    });

    harvesterSession.protocol.handle('http', async (req) => {
        const checkpointSite = Object.keys(checkpointSites).find(site => req.url.includes(site));
        const siteKey = checkpointSites[checkpointSite];

        if (req.url === `${checkpointSite}`) {
            const htmlPath = join(__dirname, './Frontend/index.html');
            const htmlExists = await access(htmlPath, fs.constants.F_OK)
                .then(() => true)
                .catch(() => false);
    
            if (htmlExists) {
                const html = await readFile(htmlPath, 'utf8');
                const updatedHtml = html.replace(
                    '<head>',
                    `<head><link rel="stylesheet" href="${checkpointSite}/index.css">`
                ).replace(
                    'data-sitekey=""',
                    `data-sitekey="${siteKey}"`
                );
                return new Response(Buffer.from(updatedHtml), { headers: { 'Content-Type': 'text/html' } });
            } else {
                console.error('Error: index.html not found');
                return new Response('Error loading page', { headers: { 'Content-Type': 'text/html' } });
            }
        } else if (req.url === `${checkpointSite}/index.css`) {
            const cssPath = join(__dirname, './Frontend/index.css');
            const cssExists = await access(cssPath, fs.constants.F_OK)
                .then(() => true)
                .catch(() => false);
    
            if (cssExists) {
                const css = await readFile(cssPath, 'utf8');
                return new Response(Buffer.from(css), { headers: { 'Content-Type': 'text/css' } });
            } else {
                console.error('Error: index.css not found');
                return new Response('Error loading CSS', { headers: { 'Content-Type': 'text/css' } });
            }
        } else {
            const response = await net.fetch(req.url).catch((error) => {
                console.error('Error fetching request:', error);
                return new Response('Error fetching request', { headers: { 'Content-Type': 'text/plain' } });
            });
            return response;
        }
    });
};

app.on('ready', () => {
    initCaptchaServer();
    initCaptchaWindow(captchaId);
});

function getCaptchaWindow() {
    return captchaWindow;
}

export {
    getCaptchaWindow,
    initCaptchaWindow
};
