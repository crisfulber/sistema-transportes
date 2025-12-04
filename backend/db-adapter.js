import dotenv from 'dotenv';
import pg from 'pg';
import Database from 'better-sqlite3';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
let pool;
let sqliteDb;

if (isProduction) {
    const { Pool } = pg;
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
} else {
    sqliteDb = new Database('database.db');
}

const db = {
    // Executa uma query que não retorna dados (INSERT, UPDATE, DELETE)
    run: async (sql, params = []) => {
        if (isProduction) {
            // Converter parâmetros nomeados do SQLite (@param) para $1, $2 do Postgres se necessário
            // Mas nosso código usa ? então precisamos converter ? para $1, $2...
            let paramIndex = 1;
            const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);

            const result = await pool.query(pgSql, params);
            return { lastInsertRowid: result.rows[0]?.id, changes: result.rowCount };
        } else {
            const stmt = sqliteDb.prepare(sql);
            return stmt.run(params);
        }
    },

    // Executa uma query que retorna uma única linha
    get: async (sql, params = []) => {
        if (isProduction) {
            let paramIndex = 1;
            const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
            const result = await pool.query(pgSql, params);
            return result.rows[0];
        } else {
            const stmt = sqliteDb.prepare(sql);
            return stmt.get(params);
        }
    },

    // Executa uma query que retorna várias linhas
    all: async (sql, params = []) => {
        if (isProduction) {
            let paramIndex = 1;
            const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
            const result = await pool.query(pgSql, params);
            return result.rows;
        } else {
            const stmt = sqliteDb.prepare(sql);
            return stmt.all(params);
        }
    },

    // Inicia uma transação
    transaction: async (callback) => {
        if (isProduction) {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                // Passamos um cliente transacional adaptado
                const trxClient = {
                    run: async (sql, params = []) => {
                        let paramIndex = 1;
                        const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
                        const result = await client.query(pgSql, params);
                        // Tentar pegar ID inserido se for INSERT
                        let lastId = null;
                        if (sql.trim().toUpperCase().startsWith('INSERT')) {
                            // Postgres não retorna ID automaticamente a menos que use RETURNING id
                            // Vamos assumir que o SQL foi adaptado ou que não precisamos do ID aqui
                            // Se precisar, o SQL deve ter RETURNING id
                            if (result.rows.length > 0) lastId = result.rows[0].id;
                        }
                        return { lastInsertRowid: lastId, changes: result.rowCount };
                    },
                    get: async (sql, params = []) => {
                        let paramIndex = 1;
                        const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`);
                        const result = await client.query(pgSql, params);
                        return result.rows[0];
                    }
                };

                const result = await callback(trxClient);
                await client.query('COMMIT');
                return result;
            } catch (e) {
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        } else {
            // SQLite transaction
            const trx = sqliteDb.transaction(callback);
            // O callback do better-sqlite3 espera argumentos diretos, não um cliente
            // Mas nossa abstração vai mudar isso.
            // Vamos simplificar: para SQLite, transaction executa a função imediatamente
            return trx();
        }
    }
};

export default db;
