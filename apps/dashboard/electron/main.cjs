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
ipcMain.handle('get-assets', async (event, subDir = '') => {
    try {
        const targetPath = path.join(ASSETS_PATH, subDir);
        // Security check
        if (!targetPath.startsWith(ASSETS_PATH)) return [];

        if (!fs.existsSync(targetPath)) return [];

        const files = fs.readdirSync(targetPath);
        return files.map(file => {
            const fullPath = path.join(targetPath, file);
            const stats = fs.statSync(fullPath);
            const isDirectory = stats.isDirectory();

            return {
                name: file,
                path: fullPath,
                relativePath: path.join(subDir, file).replace(/\\/g, '/'),
                size: isDirectory ? '-' : (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                type: isDirectory ? 'folder' : (file.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image'),
                preview: isDirectory ? null : 'file://' + fullPath.replace(/\\/g, '/')
            };
        });
    } catch (e) {
        console.error(e);
        return [];
    }
});

ipcMain.handle('get-system-stats', async () => {
    return {
        platform: os.platform(),
        release: os.release(),
        totalMem: os.totalmem(),
        freeMem: os.freemem(),
        uptime: os.uptime(),
        cpus: os.cpus(),
        totalRequests: globalRequestCount || 0
    };
});

ipcMain.handle('get-storage-usage', async () => {
    if (process.platform === 'win32') {
        try {
            const { execSync } = require('child_process');
            // PowerShell command to get C: drive usage as JSON
            const output = execSync('powershell "Get-PSDrive C | Select-Object Used,Free | ConvertTo-Json"').toString();
            const data = JSON.parse(output);

            if (data) {
                const used = data.Used;
                const free = data.Free;
                const total = used + free;
                return {
                    usedGb: (used / 1024 / 1024 / 1024).toFixed(1),
                    totalGb: (total / 1024 / 1024 / 1024).toFixed(0),
                    percent: Math.round((used / total) * 100)
                };
            }
        } catch (e) {
            console.error('Storage check failed:', e);
        }
    }
    // Fallback Mock
    return { usedGb: 120, totalGb: 500, percent: 24 };
});

// Recursive flatten helper
const getAllFiles = (dirPath, arrayOfFiles) => {
    try {
        const files = fs.readdirSync(dirPath);
        arrayOfFiles = arrayOfFiles || [];

        files.forEach(function (file) {
            const fullPath = path.join(dirPath, file);
            if (fs.statSync(fullPath).isDirectory()) {
                arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
            } else {
                arrayOfFiles.push(fullPath);
            }
        });
    } catch (e) {
        console.error('Error walking directory:', dirPath, e);
    }
    return arrayOfFiles;
};

ipcMain.handle('get-all-assets-flattened', async () => {
    try {
        const allFiles = getAllFiles(ASSETS_PATH, []);
        return allFiles.map(fullPath => {
            const relativePath = path.relative(ASSETS_PATH, fullPath).replace(/\\/g, '/');
            const stats = fs.statSync(fullPath);
            const fileName = path.basename(fullPath);

            // Filter only media
            if (!fileName.match(/\.(mp4|webm|jpg|jpeg|png|mov)$/i)) return null;

            return {
                name: fileName,
                path: fullPath, // Absolute path (legacy support)
                relativePath: relativePath, // Local server path identifier
                size: (stats.size / 1024 / 1024).toFixed(2) + ' MB',
                type: fileName.match(/\.(mp4|webm|mov)$/i) ? 'video' : 'image',
            };
        }).filter(f => f !== null);
    } catch (e) {
        console.error('Error getting all assets:', e);
        return [];
    }
});

ipcMain.handle('create-folder', async (event, { subDir, name }) => {
    try {
        const targetPath = path.join(ASSETS_PATH, subDir, name);
        if (!fs.existsSync(targetPath)) {
            fs.mkdirSync(targetPath);
            return true;
        }
        return false;
    } catch (e) {
        console.error('Error creating folder:', e);
        return false;
    }
});

ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters: [{ name: 'Media', extensions: ['jpg', 'png', 'mp4', 'webm', 'mov'] }]
    });
    return result.filePaths;
});

ipcMain.handle('import-assets', async (event, { filePaths, subDir = '' }) => {
    console.log('Importing assets to', subDir, filePaths);
    const results = [];
    if (!filePaths || !Array.isArray(filePaths)) return results;

    const targetDir = path.join(ASSETS_PATH, subDir);

    for (const srcPath of filePaths) {
        if (!srcPath) continue;
        try {
            const fileName = path.basename(srcPath);
            const destPath = path.join(targetDir, fileName);
            fs.copyFileSync(srcPath, destPath);
            results.push(destPath);
        } catch (e) {
            console.error('Failed to copy', srcPath, e);
        }
    }
    return results;
});

ipcMain.handle('delete-asset', async (event, relativePath) => {
    try {
        const targetPath = path.join(ASSETS_PATH, relativePath);
        if (targetPath.startsWith(ASSETS_PATH) && fs.existsSync(targetPath)) {
            const stat = fs.statSync(targetPath);
            if (stat.isDirectory()) {
                fs.rmdirSync(targetPath, { recursive: true });
            } else {
                fs.unlinkSync(targetPath);
            }
            return true;
        }
        return false;
    } catch (e) {
        console.error(e);
        return false;
    }
});

// New Handler for reading file buffers (for Cloud Upload)
ipcMain.handle('read-file-buffer', async (event, relativePath) => {
    try {
        // Handle absolute paths (legacy) or relative paths
        let targetPath = relativePath;
        if (!path.isAbsolute(relativePath)) {
            targetPath = path.join(ASSETS_PATH, relativePath);
        }

        // Security check if using relative logic
        if (!path.isAbsolute(relativePath) && !targetPath.startsWith(ASSETS_PATH)) {
            console.error('Security Block: Attempt to read outside Assets', targetPath);
            return null;
        }

        if (fs.existsSync(targetPath)) {
            return fs.readFileSync(targetPath);
        }
        return null;
    } catch (e) {
        console.error('Error reading file buffer:', e);
        return null;
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

// Global Request Counter for Dashboard
let globalRequestCount = 0;

const startLocalServer = () => {
    const server = http.createServer((req, res) => {
        globalRequestCount++;

        // Simple CORS
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }



        if (req.url === '/debug-list') {
            try {
                const allFiles = getAllFiles(ASSETS_PATH, []);
                const debugData = allFiles.map(f => {
                    const rel = path.relative(ASSETS_PATH, f).replace(/\\/g, '/');
                    return {
                        rel: rel,
                        abs: f,
                        exists: fs.existsSync(f),
                        stat: fs.statSync(f).isDirectory() ? 'DIR' : 'FILE'
                    };
                });
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ root: ASSETS_PATH, files: debugData }, null, 2));
            } catch (e) {
                res.writeHead(500);
                res.end(e.toString());
            }
            return;
        }

        // URL decoding
        let safeUrl = decodeURIComponent(req.url);
        // Strip query parameters if any (though unlikely for this usage)
        safeUrl = safeUrl.split('?')[0];

        // Remove leading slash manually
        if (safeUrl.startsWith('/')) safeUrl = safeUrl.slice(1);

        // Construct absolute path using path.resolve to handle separators correctly
        const filePath = path.resolve(ASSETS_PATH, safeUrl);

        // Security Check: prevent directory traversal (Check normalized, lowered paths)
        const normalizedAssetPath = path.resolve(ASSETS_PATH).toLowerCase();
        const normalizedFilePath = filePath.toLowerCase();

        // Debug Log
        console.log(`[AssetServer] Req: ${req.url} -> Safe: ${safeUrl} -> Path: ${filePath}`);

        if (!normalizedFilePath.startsWith(normalizedAssetPath)) {
            console.warn(`[AssetServer] Blocked traversal: ${filePath}`);
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }

        if (fs.existsSync(filePath)) {
            try {
                const stat = fs.statSync(filePath);

                // Check if directory
                if (stat.isDirectory()) {
                    console.warn(`[AssetServer] 404 (Is Directory): ${filePath}`);
                    res.writeHead(404);
                    res.end('Not found (Directory)');
                    return;
                }

                const fileSize = stat.size;
                const range = req.headers.range;

                // --- MIME TYPE DETECTION FIX ---
                const ext = path.extname(filePath).toLowerCase();
                let mimeType = 'application/octet-stream';
                if (ext === '.mp4') mimeType = 'video/mp4';
                else if (ext === '.webm') mimeType = 'video/webm';
                else if (ext === '.mov') mimeType = 'video/quicktime';
                else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
                else if (ext === '.png') mimeType = 'image/png';
                else if (ext === '.gif') mimeType = 'image/gif';
                // -------------------------------

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
                        'Content-Type': mimeType,
                    };

                    res.writeHead(206, head);
                    file.pipe(res);
                } else {
                    const head = {
                        'Content-Length': fileSize,
                        'Content-Type': mimeType,
                    };
                    res.writeHead(200, head);
                    fs.createReadStream(filePath).pipe(res);
                }
            } catch (err) {
                console.error('[AssetServer] Stream Error:', err);
                res.writeHead(500);
                res.end('Server Error');
            }
        } else {
            console.log('[AssetServer] 404 Not Found:', filePath);
            res.writeHead(404);
            // Return the path we TRIED to find, for debugging
            res.end(`Not found: ${filePath}`);
        }
    });

    server.listen(SERVER_PORT, () => {
        console.log(`Local Asset Server running on port ${SERVER_PORT}`);
    });
};

startLocalServer();
