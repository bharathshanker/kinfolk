// Script to verify health_docs bucket exists and has correct policies
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
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env file');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkHealthDocsBucket() {
    console.log('Checking health_docs bucket...\n');

    try {
        // Try to list buckets
        const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();

        if (bucketsError) {
            console.error('❌ Error listing buckets:', bucketsError.message);
            return;
        }

        console.log('📦 Available buckets:');
        buckets.forEach(bucket => {
            console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
        });

        const healthDocsBucket = buckets.find(b => b.name === 'health_docs');

        if (!healthDocsBucket) {
            console.log('\n❌ health_docs bucket NOT FOUND!');
            console.log('\n📝 To fix this, run the migration:');
            console.log('   supabase/migrations/20251206111500_add_health_attachments.sql');
            console.log('\nOr create it manually in Supabase Dashboard:');
            console.log('   1. Go to Storage in Supabase Dashboard');
            console.log('   2. Click "New Bucket"');
            console.log('   3. Name: health_docs');
            console.log('   4. Public: Yes');
            console.log('   5. Add RLS policies for authenticated users');
            return;
        }

        console.log('\n✅ health_docs bucket exists!');
        console.log(`   Public: ${healthDocsBucket.public}`);
        console.log(`   Created: ${healthDocsBucket.created_at}`);

        // Try to upload a test file
        console.log('\n🧪 Testing file upload...');
        const testFile = new Blob(['test'], { type: 'text/plain' });
        const testFileName = `test/${Date.now()}_test.txt`;

        const { error: uploadError } = await supabase.storage
            .from('health_docs')
            .upload(testFileName, testFile);

        if (uploadError) {
            console.error('❌ Upload test failed:', uploadError.message);
            console.log('\n💡 This might be a permissions issue. Check:');
            console.log('   1. Storage policies in Supabase Dashboard');
            console.log('   2. Make sure you\'re authenticated');
            return;
        }

        console.log('✅ Upload test successful!');

        // Clean up test file
        await supabase.storage.from('health_docs').remove([testFileName]);
        console.log('🧹 Test file cleaned up');

        console.log('\n✨ Everything looks good!');

    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

checkHealthDocsBucket();
