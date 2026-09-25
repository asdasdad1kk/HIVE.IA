const { getDatabase } = require('./connection.cjs');

function all(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    getDatabase().all(sql, parameters, (error, rows) => error ? reject(error) : resolve(rows));
  });
}

function get(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    getDatabase().get(sql, parameters, (error, row) => error ? reject(error) : resolve(row ?? null));
  });
}

function run(sql, parameters = []) {
  return new Promise((resolve, reject) => {
    getDatabase().run(sql, parameters, function callback(error) {
      if (error) reject(error);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

module.exports = { all, get, run };
