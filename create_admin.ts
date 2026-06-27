import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabasePublishableKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  '';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables before running this script.');
  console.error('   Example: ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=\'A-strong-password\' bun run create_admin.ts');
  process.exit(1);
}

if (ADMIN_PASSWORD.length < 12) {
  console.error('❌ ADMIN_PASSWORD must be at least 12 characters.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabasePublishableKey);

async function createAdmin() {
  try {
    const { error } = await supabase.functions.invoke('manage-admin', {
      body: {
        action: 'create',
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      },
    });

    if (error) {
      console.error('Error creating admin:', error);
      process.exit(1);
    }

    console.log('✅ Admin user created successfully.');
    console.log(`📧 Email: ${ADMIN_EMAIL}`);
    console.log('🔑 Password: (the value you supplied in ADMIN_PASSWORD)');
  } catch (err) {
    console.error('Exception:', err);
    process.exit(1);
  }
}

createAdmin();
