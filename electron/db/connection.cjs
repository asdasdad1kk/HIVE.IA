const { app } = require('electron');
const sqlite3 = require('sqlite3').verbose();
const fs = require('node:fs');
const path = require('node:path');

let database = null;
let databasePath = null;

function runRaw(db, sql) {
    return new Promise((resolve, reject) => {
        db.run(sql, (error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

function openDatabase(filePath) {
    return new Promise((resolve, reject) => {

        const db = new sqlite3.Database(
            filePath,
            (error) => {

                if (error) {
                    reject(error);
                    return;
                }

                resolve(db);

            }
        );

    });
}

async function initializeDatabase() {

    if (database) {
        return database;
    }

    const dataDirectory = path.join(
        process.cwd(),
        'data'
    );

    fs.mkdirSync(
        dataDirectory,
        {
            recursive: true
        }
    );

    databasePath = path.join(
        dataDirectory,
        'checklist-studio.db'
    );
    // databasePath='G:\\Share\\PANIAGUA DANIEL\\checklist\\checklist-studio.db'
    console.log(
        'DATABASE:',
        databasePath
    );

    database = await openDatabase(
        databasePath
    );

    await runRaw(
        database,
        'PRAGMA foreign_keys = ON;'
    );

    await runRaw(
        database,
        'PRAGMA journal_mode = WAL;'
    );

    await runRaw(
        database,
        `
        CREATE TABLE IF NOT EXISTS ChecklistTemplate
        (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,

            Name TEXT NOT NULL,

            Description TEXT,

            DefinitionJson TEXT NOT NULL,

            Version INTEGER NOT NULL DEFAULT 1,

            IsActive INTEGER NOT NULL DEFAULT 1,

            CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            UpdatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
        `
    );

    await runRaw(
        database,
        `
        CREATE TABLE IF NOT EXISTS ChecklistSubmission
        (
            Id INTEGER PRIMARY KEY AUTOINCREMENT,

            TemplateId INTEGER NOT NULL,

            Status TEXT NOT NULL DEFAULT 'DRAFT',

            SubmittedBy TEXT,

            DataJson TEXT NOT NULL,

            CreatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            UpdatedAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (TemplateId)
            REFERENCES ChecklistTemplate(Id)
        )
        `
    );

    await runRaw(
        database,
        `
        CREATE INDEX IF NOT EXISTS IX_ChecklistSubmission_TemplateId
        ON ChecklistSubmission(TemplateId)
        `
    );

    await runRaw(
        database,
        `
        CREATE INDEX IF NOT EXISTS IX_ChecklistSubmission_Status
        ON ChecklistSubmission(Status)
        `
    );

    await new Promise((resolve, reject) => {

        database.all(
            `
            SELECT name
            FROM sqlite_master
            WHERE type='table'
            `,
            [],
            (error, rows) => {

                if (error) {
                    reject(error);
                    return;
                }

                console.table(rows);

                resolve();
            }
        );

    });

    console.log(
        'Database initialized successfully'
    );

    return database;

}

function getDatabase() {

    if (!database) {
        throw new Error(
            'La base de datos no ha sido inicializada.'
        );
    }

    return database;

}

function getDatabasePath() {
    return databasePath;
}

function closeDatabase() {

    if (!database) {
        return;
    }

    database.close((error) => {

        if (error) {
            console.error(
                'Error closing database:',
                error
            );
            return;
        }

        console.log(
            'Database closed'
        );

    });

    database = null;

}

module.exports = {
    initializeDatabase,
    getDatabase,
    getDatabasePath,
    closeDatabase
};