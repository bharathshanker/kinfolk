import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
    console.error('Missing SUPABASE_DB_URL environment variable. Set it before running this script.');
    process.exit(1);
}

async function checkDb() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        
        console.log('--- COLLABORATION REQUESTS ---');
        const requests = await client.query('SELECT id, person_id, requester_id, target_user_id, status FROM collaboration_requests');
        console.table(requests.rows);

        console.log('--- PROFILE LINKS ---');
        const links = await client.query('SELECT id, profile_a_id, profile_b_id, user_a_id, user_b_id, is_active FROM profile_links');
        console.table(links.rows);

        console.log('--- PERSON SHARES ---');
        const shares = await client.query('SELECT id, person_id, user_id, user_email FROM person_shares');
        console.table(shares.rows);

        console.log('--- TODOS ---');
        const todos = await client.query('SELECT id, person_id, title, created_by FROM todos');
        console.table(todos.rows);

        console.log('--- ITEM SHARES ---');
        const itemShares = await client.query('SELECT id, record_type, record_id, person_share_id, created_by FROM item_shares');
        console.table(itemShares.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkDb();
