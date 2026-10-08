import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';

export function ProductCardSkeleton() {
  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden" aria-hidden="true">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-4 w-4/5 rounded-full" />
        <Skeleton className="h-3 w-2/3 rounded-full" />
        <div className="flex justify-between items-center pt-1">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-8 w-24 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function PageLoadingSkeleton() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
      <Loader2 className="w-8 h-8 text-primary animate-spin" />
      <p className="font-cairo text-sm text-muted-foreground">جاري التحميل...</p>
    </div>
  );
}

export function DashboardCardSkeleton() {
  return (
    <div className="bg-card rounded-xl border p-4 sm:p-6 space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24 rounded-full" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-32 rounded-full" />
      <Skeleton className="h-3 w-20 rounded-full" />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-3 p-3 animate-pulse">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className="h-5 flex-1 rounded-full" />
          ))}
        </div>
      ))}
    </div>
  );
}
