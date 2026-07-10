import { Link } from 'react-router-dom';
import { ChevronLeft, Grid3X3, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { useCategories } from '@/hooks/useCategories';
import { useTranslation } from '@/i18n';
import { useState, type ReactNode } from 'react';

interface Props {
  trigger: ReactNode;
}

export default function CategoriesSidebar({ trigger }: Props) {
  const { data: categories = [] } = useCategories();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent side="left" className="w-[85vw] sm:w-[380px] p-0 bg-background overflow-y-auto">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2 text-lg font-cairo font-bold uppercase tracking-wide">
              <Grid3X3 className="w-5 h-5 text-primary" />
              {t('nav.categories')}
            </SheetTitle>
          </div>
        </SheetHeader>

        <div className="p-3">
          <Link
            to="/products"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors border-b mb-2"
          >
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Grid3X3 className="w-6 h-6 text-primary" />
            </div>
            <span className="flex-1 font-cairo font-semibold text-sm uppercase tracking-wide">
              {t('nav.all')}
            </span>
            <ChevronLeft className="w-4 h-4 text-muted-foreground rtl:rotate-180" />
          </Link>

          <div className="flex flex-col">
            {categories.map((cat) => (
              <Link
                key={cat.name}
                to={`/products?category=${encodeURIComponent(cat.name)}`}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-muted transition-colors group"
              >
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center shrink-0 border">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <Grid3X3 className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <span className="flex-1 font-cairo font-semibold text-sm uppercase tracking-wide text-foreground">
                  {cat.name}
                </span>
                <ChevronLeft className="w-4 h-4 text-muted-foreground rtl:rotate-180 group-hover:text-primary transition-colors" />
              </Link>
            ))}

            {categories.length === 0 && (
              <div className="px-3 py-8 text-center text-sm text-muted-foreground">
                {t('categoriesPage.empty.title')}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
