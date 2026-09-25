const {
  contextBridge,
  ipcRenderer
} = require('electron');

console.log(
  'Checklist preload ejecutado'
);

const checklistApi = {
  templates: {
    list() {
      return ipcRenderer.invoke(
        'templates:list'
      );
    },

    get(id) {
      return ipcRenderer.invoke(
        'templates:get',
        id
      );
    },

    create(input) {
      return ipcRenderer.invoke(
        'templates:create',
        input
      );
    },

    update(id, input) {
      return ipcRenderer.invoke(
        'templates:update',
        id,
        input
      );
    },

    remove(id) {
      return ipcRenderer.invoke(
        'templates:remove',
        id
      );
    }
  },

  submissions: {
    list() {
      return ipcRenderer.invoke(
        'submissions:list'
      );
    },

    get(id) {
      return ipcRenderer.invoke(
        'submissions:get',
        id
      );
    },

    create(input) {
      return ipcRenderer.invoke(
        'submissions:create',
        input
      );
    },

    update(id, input) {
      return ipcRenderer.invoke(
        'submissions:update',
        id,
        input
      );
    },

    remove(id) {
      return ipcRenderer.invoke(
        'submissions:remove',
        id
      );
    }
  },

  dashboard: {
    stats() {
      return ipcRenderer.invoke(
        'dashboard:stats'
      );
    }
  },

  system: {
    databasePath() {
      return ipcRenderer.invoke(
        'system:database-path'
      );
    },
    getCredentials(){
      return ipcRenderer.invoke('system:credentials')
    }
  },

  windowControls: {
    minimize() {
      return ipcRenderer.invoke(
        'window:minimize'
      );
    },

    toggleMaximize() {
      return ipcRenderer.invoke(
        'window:toggle-maximize'
      );
    },

    close() {
      return ipcRenderer.invoke(
        'window:close'
      );
    },

    isMaximized() {
      return ipcRenderer.invoke(
        'window:is-maximized'
      );
    },

    onMaximizedChange(callback) {
      const listener = (
        _event,
        isMaximized
      ) => {
        callback(isMaximized);
      };

      ipcRenderer.on(
        'window:maximized-change',
        listener
      );

      return () => {
        ipcRenderer.removeListener(
          'window:maximized-change',
          listener
        );
      };
    },
    
  },

  copilot: {
    toggle() {
      return ipcRenderer.invoke(
        'copilot:toggle'
      );
    },

    isOpen() {
      return ipcRenderer.invoke(
        'copilot:is-open'
      );
    },

    reload() {
      return ipcRenderer.invoke(
        'copilot:reload'
      );
    },

    openExternal() {
      return ipcRenderer.invoke(
        'copilot:open-external'
      );
    },

    clearSession() {
      return ipcRenderer.invoke(
        'copilot:clear-session'
      );
    },

    setTheme(theme) {
      return ipcRenderer.invoke(
        'copilot:set-theme',
        theme
      );
    },

    onStateChange(callback) {
      const listener = (
        _event,
        isOpen
      ) => {
        callback(isOpen);
      };

      ipcRenderer.on(
        'copilot:state-change',
        listener
      );

      return () => {
        ipcRenderer.removeListener(
          'copilot:state-change',
          listener
        );
      };
    }
  },

  mail: {
  sendActionPlanMinute(
    payload
  ) {

    return ipcRenderer.invoke(
      'mail:action-plan-minute',
      payload
    );

  }
},
zoom: {

  set(factor) {

    return ipcRenderer.invoke(
      'app:setZoom',
      factor
    );

  }

}
};

contextBridge.exposeInMainWorld(
  'checklistApi',
  checklistApi
);

console.log(
  'Checklist API expuesta correctamente'
);