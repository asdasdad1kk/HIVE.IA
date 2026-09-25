const {
  app,
  BrowserWindow,
  WebContentsView,
  ipcMain,
  Tray,
  Menu,
  nativeImage,
  nativeTheme,
  session,
  shell
} = require('electron');

const path = require('node:path');

const {
  initializeDatabase,
  closeDatabase
} = require('./db/connection.cjs');

const {
  registerIpcHandlers
} = require('./ipc/register-ipc.cjs');

const {
  getCredentials
} = require('./repositories/user.repository.cjs');

const COPILOT_URL = 'https://copilot.microsoft.com';
const COPILOT_PANEL_WIDTH = 440;
const COPILOT_TOP_OFFSET = 88;

let mainWindow = null;
let tray = null;
let copilotView = null;
let copilotOpen = false;
let copilotAttached = false;
let copilotBoundsHooked = false;
let copilotAuthAttempts = 0;
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

function getCopilotEmail() {

  try {
    const credentials = getCredentials();

    return credentials?.email || '';
  } catch {
    return '';
  }
}

function isAuthUrl(url) {

  try {
    const hostname = new URL(url).hostname;

    return (
      hostname === 'login.live.com' ||
      hostname === 'login.microsoftonline.com' ||
      hostname === 'login.microsoft.com' ||
      hostname.endsWith('.login.live.com')
    );
  } catch {
    return false;
  }
}

function buildEmailScript(email) {

  return `
    (function () {
      try {
        var input = document.querySelector(
          'input[name="loginfmt"], input[type="email"]'
        );

        if (!input) {
          return false;
        }

        if (!input.value) {
          var setter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            'value'
          ).set;

          setter.call(input, ${JSON.stringify(email)});

          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }

        if (!input.value) {
          return false;
        }

        var button = document.querySelector(
          '#idSIButton9, input[type="submit"], button[type="submit"]'
        );

        if (button) {
          window.setTimeout(function () { button.click(); }, 400);
          return true;
        }
      } catch (error) {}

      return false;
    })();
  `;
}

function maybeFillEmail(contents) {

  if (!contents || contents.isDestroyed()) {
    return;
  }

  const url = contents.getURL();

  if (!isAuthUrl(url)) {
    copilotAuthAttempts = 0;
    return;
  }

  if (copilotAuthAttempts >= 3) {
    return;
  }

  const email = getCopilotEmail();

  if (!email) {
    return;
  }

  copilotAuthAttempts += 1;

  contents
    .executeJavaScript(buildEmailScript(email), true)
    .then(filled => {
      if (filled) {
        copilotAuthAttempts = 3;
      }
    })
    .catch(() => {});
}

function updateCopilotBounds() {

  if (
    !copilotOpen ||
    !copilotAttached ||
    !copilotView ||
    !mainWindow ||
    mainWindow.isDestroyed()
  ) {
    return;
  }

  const { width, height } =
    mainWindow.getContentBounds();

  const panelWidth = Math.min(
    COPILOT_PANEL_WIDTH,
    Math.max(320, width - 320)
  );

  copilotView.setBounds({
    x: width - panelWidth,
    y: COPILOT_TOP_OFFSET,
    width: panelWidth,
    height: Math.max(0, height - COPILOT_TOP_OFFSET)
  });
}

function hookCopilotBounds() {

  if (copilotBoundsHooked || !mainWindow) {
    return;
  }

  copilotBoundsHooked = true;

  [
    'resize',
    'maximize',
    'unmaximize',
    'restore'
  ].forEach(eventName => {
    mainWindow.on(eventName, updateCopilotBounds);
  });
}

function attachCopilotView() {

  if (
    copilotAttached ||
    !copilotView ||
    !mainWindow
  ) {
    return;
  }

  mainWindow.contentView.addChildView(copilotView);

  copilotAttached = true;

  updateCopilotBounds();
}

function detachCopilotView() {

  if (!copilotAttached || !copilotView) {
    return;
  }

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.contentView.removeChildView(copilotView);
  }

  copilotAttached = false;
}

function createCopilotView() {

  copilotView = new WebContentsView({
    webPreferences: {
      partition: 'persist:copilot',
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  const contents = copilotView.webContents;

  contents.setWindowOpenHandler(({ url }) => {

    if (isAuthUrl(url)) {
      contents.loadURL(url);

      return { action: 'deny' };
    }

    if (url.startsWith('http')) {
      shell.openExternal(url);
    }

    return { action: 'deny' };
  });

  contents.on(
    'did-navigate',
    () => maybeFillEmail(contents)
  );

  contents.on(
    'did-finish-load',
    () => {

      maybeFillEmail(contents);

      if (!contents.isDestroyed()) {
        contents
          .executeJavaScript(
            `document.documentElement.style.colorScheme = ${
              JSON.stringify(
                nativeTheme.shouldUseDarkColors
                  ? 'dark'
                  : 'light'
              )
            };`,
            true
          )
          .catch(() => {});
      }
    }
  );

  contents.loadURL(COPILOT_URL);
}

function broadcastCopilotState() {

  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(
    'copilot:state-change',
    copilotOpen
  );
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
    'copilot:toggle',
    () => {

      copilotOpen = !copilotOpen;

      if (copilotOpen) {

        if (!copilotView) {
          createCopilotView();
        }

        hookCopilotBounds();
        attachCopilotView();

        copilotView.webContents.focus();
      } else {
        detachCopilotView();
      }

      broadcastCopilotState();

      return copilotOpen;
    }
  );

  ipcMain.handle(
    'copilot:is-open',
    () => copilotOpen
  );

  ipcMain.handle(
    'copilot:reload',
    () => {

      if (
        copilotView &&
        !copilotView.webContents.isDestroyed()
      ) {
        copilotView.webContents.reload();
      }
    }
  );

  ipcMain.handle(
    'copilot:open-external',
    () => {

      const url =
        copilotView &&
        !copilotView.webContents.isDestroyed()
          ? copilotView.webContents.getURL()
          : '';

      shell.openExternal(
        url && url.startsWith('http')
          ? url
          : COPILOT_URL
      );
    }
  );

  ipcMain.handle(
    'copilot:clear-session',
    async () => {
      const partitionSession =
        session.fromPartition('persist:copilot');

      await partitionSession.clearStorageData();
      await partitionSession.clearCache();

      copilotAuthAttempts = 0;

      if (
        copilotView &&
        !copilotView.webContents.isDestroyed()
      ) {
        copilotView.webContents.loadURL(
          COPILOT_URL
        );
      }

      return true;
    }
  );

  ipcMain.handle(
    'copilot:set-theme',
    (_event, theme) => {

      nativeTheme.themeSource =
        theme === 'light'
          ? 'light'
          : 'dark';
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