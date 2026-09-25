const {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  nativeImage
} = require('electron');

const path = require('node:path');

const {
  initializeDatabase,
  closeDatabase
} = require('./db/connection.cjs');

const {
  registerIpcHandlers
} = require('./ipc/register-ipc.cjs');

let mainWindow = null;
let tray = null;
let isQuitting = false;

async function createWindow() {
  await initializeDatabase();
  registerIpcHandlers();

  const preloadPath = path.join(
    __dirname,
    'preload.cjs'
  );

  mainWindow = new BrowserWindow({
    width: 1500,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#09090b',
    frame: false,
    titleBarStyle: 'hidden',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.on(
    'maximize',
    () => {
      mainWindow?.webContents.send(
        'window:maximized-change',
        true
      );
    }
  );

  mainWindow.on(
    'unmaximize',
    () => {
      mainWindow?.webContents.send(
        'window:maximized-change',
        false
      );
    }
  );

  // HIDE TO TRAY
  mainWindow.on(
    'close',
    event => {

      if (isQuitting) {
        return;
      }

      event.preventDefault();

      mainWindow.hide();
    }
  );

  mainWindow.webContents.on(
    'did-finish-load',
    () => {
      console.log(
        'Angular cargado correctamente'
      );
    }
  );

  createTray();

  const developmentUrl =
    process.env.ELECTRON_START_URL;

  if (developmentUrl) {

    await mainWindow.loadURL(
      developmentUrl
    );

    mainWindow.webContents.openDevTools({
      mode: 'detach'
    });

    return;
  }

  const angularIndex = path.join(
    __dirname,
    '..',
    'dist',
    'frontend',
    'browser',
    'index.html'
  );

  await mainWindow.loadFile(
    angularIndex
  );
}

function createTray() {

  if (tray) {
    return;
  }

  const trayIcon = nativeImage.createFromPath(
    path.join(
      __dirname,
      '..',
      'src',
      'assets',
      'G.png'
    )
  );

  tray = new Tray(trayIcon);

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open HIVE AI',
      click: () => {

        if (!mainWindow) {
          return;
        }

        mainWindow.show();
        mainWindow.focus();
      }
    },
    {
      type: 'separator'
    },
    {
      label: 'Exit',
      click: () => {

        isQuitting = true;

        if (mainWindow) {
          mainWindow.destroy();
        }

        app.quit();
      }
    }
  ]);

  tray.setToolTip('HIVE AI');

  tray.setContextMenu(menu);

  tray.on(
    'double-click',
    () => {

      if (!mainWindow) {
        return;
      }

      mainWindow.show();
      mainWindow.focus();
    }
  );
}

app.whenReady()
  .then(async () => {

    registerWindowHandlers();

    await createWindow();
  })
  .catch(error => {

    console.error(
      'No se pudo iniciar Electron:',
      error
    );

    app.quit();
  });

app.on(
  'activate',
  () => {

    if (
      BrowserWindow.getAllWindows().length === 0
    ) {
      void createWindow();
    }
  }
);

app.on(
  'before-quit',
  () => {

    isQuitting = true;

    closeDatabase();
  }
);

function getEventWindow(event) {

  const window =
    BrowserWindow.fromWebContents(
      event.sender
    );

  if (!window) {
    throw new Error(
      'No se encontró la ventana.'
    );
  }

  return window;
}

function registerWindowHandlers() {

  ipcMain.handle(
    'app:setZoom',
    (event, factor) => {

      const window =
        BrowserWindow.fromWebContents(
          event.sender
        );

      if (!window) {
        return;
      }

      window.webContents.setZoomFactor(
        factor
      );
    }
  );

  ipcMain.handle(
    'window:minimize',
    event => {

      getEventWindow(event)
        .minimize();
    }
  );

  ipcMain.handle(
    'window:toggle-maximize',
    event => {

      const window =
        getEventWindow(event);

      if (window.isMaximized()) {

        window.unmaximize();

        return false;
      }

      window.maximize();

      return true;
    }
  );

  ipcMain.handle(
    'window:close',
    event => {

      getEventWindow(event)
        .close();
    }
  );

  ipcMain.handle(
    'window:is-maximized',
    event => {

      return getEventWindow(event)
        .isMaximized();
    }
  );
}