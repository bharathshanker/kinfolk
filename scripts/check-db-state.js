import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres:Sai@parti2311@db.dkmntyruxypkebviwlrl.supabase.co:5432/postgres';

async function checkDb() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        
        console.log('--- PEOPLE ---');
        const people = await client.query('SELECT id, name, created_by, email, linked_user_id FROM people');
        console.table(people.rows);

        console.log('--- PROFILES ---');
        const profiles = await client.query('SELECT id, full_name, email FROM profiles');
        console.table(profiles.rows);

        console.log('--- COLLABORATION REQUESTS ---');
        const requests = await client.query('SELECT id, person_id, requester_id, target_user_id, target_email, status FROM collaboration_requests');
        console.table(requests.rows);

        console.log('--- PROFILE LINKS ---');
        const links = await client.query('SELECT id, profile_a_id, profile_b_id, user_a_id, user_b_id, is_active FROM profile_links');
        console.table(links.rows);

        console.log('--- PERSON SHARES ---');
        const shares = await client.query('SELECT id, person_id, user_id, user_email FROM person_shares');
        console.table(shares.rows);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

checkDb();

