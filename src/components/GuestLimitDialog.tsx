import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, LogIn } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSignIn: () => void;
  limit?: number;
}

export default function GuestLimitDialog({ open, onOpenChange, onSignIn, limit = 2 }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mb-3">
            <AlertCircle className="w-7 h-7 text-destructive" />
          </div>
          <DialogTitle className="font-cairo text-xl">يجب تسجيل الدخول لإكمال الطلب</DialogTitle>
          <DialogDescription className="font-cairo text-sm leading-relaxed">
            لقد وصلت للحد الأقصى ({limit}) من الطلبات كزائر بهذا الرقم. الرجاء تسجيل الدخول أو إنشاء حساب لإكمال الطلب. سيتم الاحتفاظ بالبيانات التي أدخلتها.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="font-cairo">
            إلغاء
          </Button>
          <Button onClick={onSignIn} className="font-cairo gap-2">
            <LogIn className="w-4 h-4" />
            تسجيل الدخول
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
