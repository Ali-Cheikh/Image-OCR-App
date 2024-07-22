const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 1020,
        icon: path.join(__dirname, 'logo.png'),
        webPreferences: {
            nodeIntegration: true
        }
    });

    // Load the HTML file
    win.loadFile('index.html');

    // Adjust window size when the HTML content is loaded
    win.webContents.on('did-finish-load', () => {
        // Get the dimensions of the canvas element
        const canvas = win.webContents.executeJavaScript(`
            document.querySelector('canvas').getBoundingClientRect();
        `);

        // Set window size based on canvas dimensions
        canvas.then(dimensions => {
            if (dimensions.width && dimensions.height) {
                win.setSize(dimensions.width, dimensions.height);
            }
        });
    });
}


app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
