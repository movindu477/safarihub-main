import { supabase, uploadProviderDocumentClientSide } from './lib/supabase.js';

/**
 * Test Supabase Connection and Document Upload
 * Run this in browser console to verify Supabase is working
 */

async function testSupabaseConnection() {
    console.log('🧪 Testing Supabase Connection...');

    // Test 1: Check if Supabase client is initialized
    console.log('1️⃣ Checking Supabase client initialization...');
    if (!supabase) {
        console.error('❌ Supabase client is not initialized!');
        return false;
    }
    console.log('✅ Supabase client initialized');

    // Test 2: Check environment variables
    console.log('2️⃣ Checking environment variables...');
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase environment variables missing!', {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseKey
        });
        return false;
    }
    console.log('✅ Environment variables loaded:', {
        url: supabaseUrl,
        keyLength: supabaseKey.length
    });

    // Test 3: List buckets
    console.log('3️⃣ Checking bucket access...');
    try {
        const { data: buckets, error } = await supabase.storage.listBuckets();
        if (error) {
            console.error('❌ Failed to list buckets:', error);
            return false;
        }
        console.log('✅ Buckets accessible:', buckets.map(b => b.name));

        const hasProviderDocs = buckets.some(b => b.name === 'PROVIDER-DOCUMENTS');
        if (!hasProviderDocs) {
            console.error('❌ PROVIDER-DOCUMENTS bucket not found!');
            return false;
        }
        console.log('✅ PROVIDER-DOCUMENTS bucket exists');
    } catch (err) {
        console.error('❌ Bucket check failed:', err);
        return false;
    }

    // Test 4: Test file upload (create a dummy file)
    console.log('4️⃣ Testing file upload...');
    try {
        const testContent = 'This is a test document for Supabase upload verification';
        const testBlob = new Blob([testContent], { type: 'text/plain' });
        const testFile = new File([testBlob], 'test-document.txt', { type: 'text/plain' });

        const testUserId = 'test-user-' + Date.now();
        const { url, path, error } = await uploadProviderDocumentClientSide(testFile, testUserId, 'test-document.txt');

        if (error) {
            console.error('❌ Upload test failed:', error);
            return false;
        }

        if (!url || !path) {
            console.error('❌ Upload succeeded but no URL/path returned');
            return false;
        }

        console.log('✅ Upload test successful:', { url, path });

        // Clean up test file
        console.log('🧹 Cleaning up test file...');
        const { error: deleteError } = await supabase.storage
            .from('PROVIDER-DOCUMENTS')
            .remove([path]);

        if (deleteError) {
            console.warn('⚠️ Failed to clean up test file:', deleteError);
        } else {
            console.log('✅ Test file cleaned up');
        }
    } catch (err) {
        console.error('❌ Upload test failed:', err);
        return false;
    }

    console.log('');
    console.log('🎉 All Supabase tests passed!');
    console.log('✅ Supabase is properly configured and working');
    console.log('');
    console.log('Next step: Deploy Firestore rules to fix registration');
    return true;
}

// Auto-run test when this file is imported
testSupabaseConnection();

export { testSupabaseConnection };
