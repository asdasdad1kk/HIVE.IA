const sql = require('../db/sqlite-helpers.cjs');

async function list() {
  return sql.all(`
    SELECT Id AS id, Name AS name, Description AS description,
           DefinitionJson AS definitionJson, Version AS version,
           IsActive AS isActive, CreatedAt AS createdAt, UpdatedAt AS updatedAt
    FROM ChecklistTemplate
    ORDER BY UpdatedAt DESC, Id DESC
  `);
}

async function getById(id) {
  return sql.get(`
    SELECT Id AS id, Name AS name, Description AS description,
           DefinitionJson AS definitionJson, Version AS version,
           IsActive AS isActive, CreatedAt AS createdAt, UpdatedAt AS updatedAt
    FROM ChecklistTemplate WHERE Id = ?
  `, [id]);
}

async function create(input) {
  const result = await sql.run(`
    INSERT INTO ChecklistTemplate (Name, Description, DefinitionJson)
    VALUES (?, ?, ?)
  `, [input.name.trim(), input.description?.trim() || null, JSON.stringify(input.definition)]);
  return getById(result.id);
}

async function update(id, input) {
  await sql.run(`
    UPDATE ChecklistTemplate
       SET Name = ?, Description = ?, DefinitionJson = ?,
           Version = Version + 1, UpdatedAt = CURRENT_TIMESTAMP
     WHERE Id = ?
  `, [input.name.trim(), input.description?.trim() || null, JSON.stringify(input.definition), id]);
  return getById(id);
}

// async function remove(id) {
//   const references = await sql.get(
//     'SELECT COUNT(*) AS total FROM ChecklistSubmission WHERE TemplateId = ?', [id]
//   );
//   if (references.total > 0) {
//     throw new Error('No se puede eliminar una plantilla que ya tiene capturas. Desactívala en una versión futura.');
//   }
//   return sql.run('DELETE FROM ChecklistTemplate WHERE Id = ?', [id]);
// }
async function remove(id) {
  await sql.run('BEGIN TRANSACTION');

  try {
    await sql.run(
      'DELETE FROM ChecklistSubmission WHERE TemplateId = ?',
      [id]
    );

    await sql.run(
      'DELETE FROM ChecklistTemplate WHERE Id = ?',
      [id]
    );

    await sql.run('COMMIT');
  } catch (error) {
    await sql.run('ROLLBACK');
    throw error;
  }
}
module.exports = { list, getById, create, update, remove };
