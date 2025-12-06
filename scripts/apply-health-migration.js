// Apply the health attachments migration
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env file manually
const envPath = join(__dirname, '../.env');
const envContent = readFileSync(envPath, 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1].trim()] = match[2].trim();
    }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = envVars.VITE_SUPABASE_SERVICE_KEY || envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials in .env file');
    console.log('\nYou need either:');
    console.log('  - VITE_SUPABASE_SERVICE_KEY (preferred for migrations)');
    console.log('  - VITE_SUPABASE_ANON_KEY (will work for bucket creation)');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
    console.log('🚀 Applying health attachments migration...\n');

    try {
        // Step 1: Add attachments column to health_records
        console.log('1️⃣ Adding attachments column to health_records table...');
        const { error: alterError } = await supabase.rpc('exec_sql', {
            sql: 'ALTER TABLE public.health_records ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT \'{}\';'
        });

        if (alterError && !alterError.message.includes('already exists')) {
            console.log('   ⚠️  Could not add column via RPC. You may need to run this in Supabase SQL Editor:');
            console.log('   ALTER TABLE public.health_records ADD COLUMN IF NOT EXISTS attachments text[] DEFAULT \'{}\';');
        } else {
            console.log('   ✅ Column added (or already exists)');
        }

        // Step 2: Create health_docs bucket
        console.log('\n2️⃣ Creating health_docs storage bucket...');
        const { data: bucket, error: bucketError } = await supabase.storage.createBucket('health_docs', {
            public: true,
            fileSizeLimit: 52428800, // 50MB
            allowedMimeTypes: ['image/*', 'application/pdf', 'text/*']
        });

        if (bucketError) {
            if (bucketError.message.includes('already exists')) {
                console.log('   ℹ️  Bucket already exists');
            } else {
                console.error('   ❌ Error creating bucket:', bucketError.message);
            }
        } else {
            console.log('   ✅ Bucket created successfully');
        }

        // Step 3: Verify bucket exists
        console.log('\n3️⃣ Verifying bucket...');
        const { data: buckets } = await supabase.storage.listBuckets();
        const healthDocsBucket = buckets?.find(b => b.name === 'health_docs');

        if (healthDocsBucket) {
            console.log('   ✅ health_docs bucket confirmed');
            console.log(`      Public: ${healthDocsBucket.public}`);
        } else {
            console.log('   ❌ Bucket not found after creation');
        }

        console.log('\n✨ Migration complete!');
        console.log('\n📝 Note: Storage policies need to be set in Supabase Dashboard:');
        console.log('   1. Go to Storage > health_docs > Policies');
        console.log('   2. Add policy: "Authenticated users can upload"');
        console.log('      - Operation: INSERT');
        console.log('      - Target roles: authenticated');
        console.log('   3. Add policy: "Authenticated users can read"');
        console.log('      - Operation: SELECT');
        console.log('      - Target roles: authenticated');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

applyMigration();
