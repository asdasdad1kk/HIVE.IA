const sql = require('../db/sqlite-helpers.cjs');

async function list() {
  return sql.all(`
    SELECT
      s.Id AS id,
      s.TemplateId AS templateId,
      t.Name AS templateName,
      t.DefinitionJson AS templateDefinitionJson,
      s.Status AS status,
      s.SubmittedBy AS submittedBy,
      s.DataJson AS dataJson,
      s.CreatedAt AS createdAt,
      s.UpdatedAt AS updatedAt
    FROM ChecklistSubmission s
    INNER JOIN ChecklistTemplate t
      ON t.Id = s.TemplateId
    ORDER BY
      s.UpdatedAt DESC,
      s.Id DESC
  `);
}

async function getById(id) {
  return sql.get(`
    SELECT Id AS id, TemplateId AS templateId, Status AS status,
           SubmittedBy AS submittedBy, DataJson AS dataJson,
           CreatedAt AS createdAt, UpdatedAt AS updatedAt
    FROM ChecklistSubmission WHERE Id = ?
  `, [id]);
}

async function create(input) {
  const result = await sql.run(`
    INSERT INTO ChecklistSubmission (TemplateId, Status, SubmittedBy, DataJson)
    VALUES (?, ?, ?, ?)
  `, [input.templateId, input.status || 'DRAFT', input.submittedBy?.trim() || null, JSON.stringify(input.data ?? {})]);
  return getById(result.id);
}

async function update(id, input) {
  await sql.run(`
    UPDATE ChecklistSubmission
       SET Status = ?, SubmittedBy = ?, DataJson = ?, UpdatedAt = CURRENT_TIMESTAMP
     WHERE Id = ?
  `, [input.status, input.submittedBy?.trim() || null, JSON.stringify(input.data ?? {}), id]);
  return getById(id);
}

function remove(id) {
  return sql.run('DELETE FROM ChecklistSubmission WHERE Id = ?', [id]);
}

module.exports = { list, getById, create, update, remove };
