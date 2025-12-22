const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Ensure Assets Directory Exists
const ASSETS_PATH = path.join(app.getPath('userData'), 'Assets');
if (!fs.existsSync(ASSETS_PATH)) {
    fs.mkdirSync(ASSETS_PATH, { recursive: true });
}

// IPC Handlers
ipcMain.handle('get-assets', async () => {
    try {
        const files = fs.readdirSync(ASSETS_PATH);
        return files.map(file => {
            const stats = fs.statSync(path.join(ASSETS_PATH, file));
            return {
                name: file,
                path: path.join(ASSETS_PATH, file),
                size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                type: file.match(/\.(mp4|webm)$/i) ? 'video' : 'image',
                preview: 'file://' + path.join(ASSETS_PATH, file).replace(/\\/g, '/') // Ensure forward slashes for URL
            };
        });
    } catch (e) {
        console.error(e);
        return [];
    }
});

ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Media', extensions: ['jpg', 'png', 'mp4', 'webm'] }]
    });
    return result.filePaths;
});

ipcMain.handle('import-assets', async (event, filePaths) => {
    console.log('Importing assets:', filePaths); // Debug log
    const results = [];
    if (!filePaths || !Array.isArray(filePaths)) return results;

    for (const srcPath of filePaths) {
        if (!srcPath) continue;
        try {
            const fileName = path.basename(srcPath);
            const destPath = path.join(ASSETS_PATH, fileName);
            fs.copyFileSync(srcPath, destPath);
            results.push(destPath);
        } catch (e) {
            console.error('Failed to copy', srcPath, e);
        }
    }
    return results;
});

ipcMain.handle('delete-asset', async (event, fileName) => {
    try {
        const targetPath = path.join(ASSETS_PATH, fileName);
        if (fs.existsSync(targetPath)) {
            fs.unlinkSync(targetPath);
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
});

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false, // For easier access to node for local server
        },
        // Apple-esque Style
        titleBarStyle: 'hiddenInset',
    });

    // Load the index.html of the app.
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    }
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Basic HTTP Server for Local Assets (Zero Cost Tunnel)
const http = require('http');

const SERVER_PORT = 11222;

const startLocalServer = () => {
    const server = http.createServer((req, res) => {
        // Simple CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        // URL decoding to handle spaces etc
        const safeUrl = decodeURIComponent(req.url);
        const fileName = safeUrl.replace(/^\//, ''); // Remove leading slash
        const filePath = path.join(ASSETS_PATH, fileName);

        // Security Check: prevent directory traversal
        if (!filePath.startsWith(ASSETS_PATH)) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            const fileSize = stat.size;
            const range = req.headers.range;

            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;
                const file = fs.createReadStream(filePath, { start, end });

                const head = {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': 'video/mp4', // Naive MIME, works for most in this scope
                };

                res.writeHead(206, head);
                file.pipe(res);
            } else {
                const head = {
                    'Content-Length': fileSize,
                    'Content-Type': 'video/mp4',
                };
                res.writeHead(200, head);
                fs.createReadStream(filePath).pipe(res);
            }
        } else {
            console.log('404 Not Found:', filePath);
            res.writeHead(404);
            res.end('Not found');
        }
    });

    server.listen(SERVER_PORT, () => {
        console.log(`Local Asset Server running on port ${SERVER_PORT}`);
    });
};

startLocalServer();

// ... existing createWindow ...
