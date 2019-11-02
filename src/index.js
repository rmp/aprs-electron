const electron = require('electron');
const net = require('net');
const aprsParser = require('aprs-parser');
const { app, BrowserWindow, ipcMain } = require('electron');
const parser = new aprsParser.APRSParser();
const user = 'G7TKI-TS';
const pass = '-1';
const appId = 'aprs-is.js 0.01';
const sock = new net.Socket();
//const filter = 't/wp';
const filter = 'r/33.25/-96.5/50';

function createWindow () {
    // Create the browser window.
    const win = new BrowserWindow({
	width: 800,
	height: 600,
	webPreferences: {
	    nodeIntegration: true,
	}
    });

    win.webContents.openDevTools()

    // and load the index.html of the app.
    win.loadFile('index.html');

    sock.connect({
	port: '14580',
	host: 'uk.aprs2.net',
    });

    sock.on('ready', () => {
	console.log(`logging in user ${user} pass ${pass} vers ${app} filter ${filter}`);
	sock.write(`user ${user} pass ${pass} vers ${appId} filter ${filter}\n`, () => {});
	sock.on('data', (buf) => {
	    const data = String(buf).replace(/[\r\n]+$/, '');
	    const obj = parser.parse(data);
	    win.webContents.send('aprs', obj);
	});
    });
}

app.on('ready', createWindow);

