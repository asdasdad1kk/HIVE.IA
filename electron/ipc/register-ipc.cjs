const { ipcMain } = require('electron');
const templates = require('../repositories/template.repository.cjs');
const submissions = require('../repositories/submission.repository.cjs');
const sql = require('../db/sqlite-helpers.cjs');
const { getDatabasePath } = require('../db/connection.cjs');
const { getCredentials } = require('../repositories/user.repository.cjs');
const {sendActionPlanMinute} = require('../services/mail.service.cjs');
let registered = false;

function validateId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error('Id inválido.');
  return id;
}

function validateTemplate(input) {
  if (!input || typeof input !== 'object') throw new Error('Datos de plantilla inválidos.');
  if (typeof input.name !== 'string' || !input.name.trim()) throw new Error('El nombre es obligatorio.');
  if (!input.definition || typeof input.definition !== 'object') throw new Error('La definición es obligatoria.');
  return input;
}

function validateSubmission(input) {
  if (!input || typeof input !== 'object') throw new Error('Datos de captura inválidos.');
  validateId(input.templateId);
  const statuses = new Set(['DRAFT', 'COMPLETE', 'CANCELLED']);
  if (input.status && !statuses.has(input.status)) throw new Error('Estado inválido.');
  return input;
}

function registerIpcHandlers() {
  if (registered) return;
  registered = true;

  ipcMain.handle('templates:list', () => templates.list());
  ipcMain.handle('templates:get', (_event, id) => templates.getById(validateId(id)));
  ipcMain.handle('templates:create', (_event, input) => templates.create(validateTemplate(input)));
  ipcMain.handle('templates:update', (_event, id, input) => templates.update(validateId(id), validateTemplate(input)));
  ipcMain.handle('templates:remove', (_event, id) => templates.remove(validateId(id)));

  ipcMain.handle('submissions:list', () => submissions.list());
  ipcMain.handle('submissions:get', (_event, id) => submissions.getById(validateId(id)));
  ipcMain.handle('submissions:create', (_event, input) => submissions.create(validateSubmission(input)));
  ipcMain.handle('submissions:update', (_event, id, input) => submissions.update(validateId(id), validateSubmission(input)));
  ipcMain.handle('submissions:remove', (_event, id) => submissions.remove(validateId(id)));

  ipcMain.handle('dashboard:stats', async () => {
    const [templatesCount, submissionsCount, completeCount] = await Promise.all([
      sql.get('SELECT COUNT(*) AS total FROM ChecklistTemplate WHERE IsActive = 1'),
      sql.get('SELECT COUNT(*) AS total FROM ChecklistSubmission'),
      sql.get("SELECT COUNT(*) AS total FROM ChecklistSubmission WHERE Status = 'COMPLETE'")
    ]);
    return {
      templates: templatesCount.total,
      submissions: submissionsCount.total,
      complete: completeCount.total,
      drafts: submissionsCount.total - completeCount.total
    };
  });

  ipcMain.handle('system:database-path', () => getDatabasePath());

 ipcMain.handle(
  'system:credentials',
  () => {
    const result =
      getCredentials();

    console.log(
      'IPC RESULT:',
      result
    );

    return result;
  }
);
ipcMain.handle(
  'mail:action-plan-minute',
  async (
    _event,
    payload
  ) => {
     console.log(payload)
    await sendActionPlanMinute(
      payload
    );

    return true;
  }
);

}

module.exports = { registerIpcHandlers };
