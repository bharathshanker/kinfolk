import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = 'postgresql://postgres:Sai@parti2311@db.dkmntyruxypkebviwlrl.supabase.co:5432/postgres';

const client = new Client({
    connectionString,
});

async function applyMigration() {
    try {
        await client.connect();
        console.log('Connected to Supabase DB');

        const migrationPath = path.join(__dirname, '../supabase/migrations/20251205174834_add_finance_table.sql');
        const sql = fs.readFileSync(migrationPath, 'utf8');

        console.log('Applying finance migration...');
        await client.query(sql);
        console.log('Migration applied successfully!');

    } catch (err) {
        console.error('Error applying migration:', err);
    } finally {
        await client.end();
    }
}

applyMigration();
