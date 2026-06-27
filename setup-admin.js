import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!SUPABASE_URL) {
  console.error('❌ Missing VITE_SUPABASE_URL env var');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY env var');
  process.exit(1);
}

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('❌ Missing ADMIN_EMAIL and/or ADMIN_PASSWORD env vars. No defaults are provided for security reasons.');
  process.exit(1);
}

if (ADMIN_PASSWORD.length < 12) {
  console.error('❌ ADMIN_PASSWORD must be at least 12 characters.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setupAdmin() {
  try {
    console.log(`Creating admin user (${ADMIN_EMAIL})...`);
    
    // Create auth user
    const { data, error } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
    });

    if (error) {
      if (error.message.toLowerCase().includes('already')) {
        const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
        if (listErr) throw new Error(`Auth list failed: ${listErr.message}`);

        const existing = usersData.users.find((user) => user.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase());
        if (!existing) throw new Error(`Auth creation failed: ${error.message}`);

        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({ user_id: existing.id, role: 'admin' }, { onConflict: 'user_id,role' });

        if (roleError) throw new Error(`Role assignment failed: ${roleError.message}`);

        console.log('✅ Existing auth user found, admin role ensured');
        console.log('\n🎉 Admin setup complete!\n');
        console.log(`📧 Email:    ${ADMIN_EMAIL}`);
        console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
        console.log('🔗 Login:    http://localhost:8081/admin\n');
        return;
      }

      throw new Error(`Auth creation failed: ${error.message}`);
    }

    console.log('✅ Auth user created:', data.user?.id);

    // Assign admin role
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({
        user_id: data.user?.id,
        role: 'admin',
      });

    if (roleError) {
      throw new Error(`Role assignment failed: ${roleError.message}`);
    }

    console.log('✅ Admin role assigned');
    console.log('\n🎉 Admin setup complete!\n');
    console.log(`📧 Email:    ${ADMIN_EMAIL}`);
    console.log(`🔑 Password: ${ADMIN_PASSWORD}`);
    console.log('🔗 Login:    http://localhost:8081/admin\n');

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

setupAdmin();
