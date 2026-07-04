import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Key, Shield, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AdminUserManagement from '@/components/admin/AdminUserManagement';


export default function AdminSecurityPage() {
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-card border rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-primary" />
          <h2 className="font-cairo font-bold text-xl">تغيير كلمة المرور</h2>
        </div>
        <div>
          <Label className="font-cairo">كلمة المرور الحالية</Label>
          <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} className="font-roboto mt-1" dir="ltr" />
        </div>
        <div>
          <Label className="font-cairo">كلمة المرور الجديدة</Label>
          <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="font-roboto mt-1" dir="ltr" />
        </div>
        <div>
          <Label className="font-cairo">تأكيد كلمة المرور الجديدة</Label>
          <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="font-roboto mt-1" dir="ltr" />
        </div>
        <Button
          disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
          className="font-cairo font-semibold gap-2"
          onClick={async () => {
            if (newPassword !== confirmPassword) {
              toast({ title: 'كلمة المرور الجديدة غير متطابقة', variant: 'destructive' });
              return;
            }
            if (newPassword.length < 6) {
              toast({ title: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل', variant: 'destructive' });
              return;
            }
            setChangingPassword(true);
            const { data: { user } } = await supabase.auth.getUser();
            const { error: signInErr } = await supabase.auth.signInWithPassword({
              email: user?.email || '',
              password: currentPassword,
            });
            if (signInErr) {
              toast({ title: 'كلمة المرور الحالية غير صحيحة', variant: 'destructive' });
              setChangingPassword(false);
              return;
            }
            const { error } = await supabase.auth.updateUser({ password: newPassword });
            setChangingPassword(false);
            if (error) {
              toast({ title: 'فشل تغيير كلمة المرور', description: error.message, variant: 'destructive' });
            } else {
              toast({ title: 'تم تغيير كلمة المرور بنجاح ✅' });
              setCurrentPassword('');
              setNewPassword('');
              setConfirmPassword('');
            }
          }}
        >
          <Shield className="w-4 h-4" />
          {changingPassword ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
        </Button>
      </div>

      <AdminUserManagement toast={toast} />
    </div>
  );
}
