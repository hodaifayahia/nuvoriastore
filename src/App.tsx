import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnnouncementBar from "@/components/AnnouncementBar";
import TopMarquee from "@/components/TopMarquee";
import ScrollToTop from "@/components/ScrollToTop";
import ScrollToTopOnRouteChange from "@/components/ScrollToTopOnRouteChange";
import WhatsAppFloat from "@/components/WhatsAppFloat";

import AdminLayout from "@/components/AdminLayout";
// Keep the homepage eager for fast LCP; lazy-load everything else.
import Index from "./pages/Index";

const ProductsPage = lazy(() => import("./pages/ProductsPage"));
const SingleProductPage = lazy(() => import("./pages/SingleProductPage"));
const CartPage = lazy(() => import("./pages/CartPage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const OrderConfirmationPage = lazy(() => import("./pages/OrderConfirmationPage"));
const TrackOrderPage = lazy(() => import("./pages/TrackOrderPage"));
const AuthPage = lazy(() => import("./pages/AuthPage"));
const CustomerDashboardPage = lazy(() => import("./pages/CustomerDashboardPage"));
const AdminLoginPage = lazy(() => import("./pages/admin/AdminLoginPage"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminProductsPage = lazy(() => import("./pages/admin/AdminProductsPage"));
const AdminOrdersPage = lazy(() => import("./pages/admin/AdminOrdersPage"));
const AdminWilayasPage = lazy(() => import("./pages/admin/AdminWilayasPage"));
const AdminCouponsPage = lazy(() => import("./pages/admin/AdminCouponsPage"));
const AdminCategoriesPage = lazy(() => import("./pages/admin/AdminCategoriesPage"));
const AdminBrandsPage = lazy(() => import("./pages/admin/AdminBrandsPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));
const AdminIdentityPage = lazy(() => import("./pages/admin/settings/AdminIdentityPage"));
const AdminPaymentPage = lazy(() => import("./pages/admin/settings/AdminPaymentPage"));
const AdminTelegramPage = lazy(() => import("./pages/admin/settings/AdminTelegramPage"));
const AdminReturnsSettingsPage = lazy(() => import("./pages/admin/settings/AdminReturnsSettingsPage"));
const AdminFormSettingsPage = lazy(() => import("./pages/admin/settings/AdminFormSettingsPage"));
const AdminHomepagePage = lazy(() => import("./pages/admin/settings/AdminHomepagePage"));
const AdminFAQPage = lazy(() => import("./pages/admin/settings/AdminFAQPage"));
const AdminSecurityPage = lazy(() => import("./pages/admin/settings/AdminSecurityPage"));
const AdminLeadsPage = lazy(() => import("./pages/admin/AdminLeadsPage"));
const AdminVariationsPage = lazy(() => import("./pages/admin/AdminVariationsPage"));
const AdminAbandonedPage = lazy(() => import("./pages/admin/AdminAbandonedPage"));
const AdminInventoryPage = lazy(() => import("./pages/admin/AdminInventoryPage"));
const AdminConfirmersPage = lazy(() => import("./pages/admin/AdminConfirmersPage"));
const AdminReturnsPage = lazy(() => import("./pages/admin/AdminReturnsPage"));
const AdminCostsPage = lazy(() => import("./pages/admin/AdminCostsPage"));
const AdminCostDetailPage = lazy(() => import("./pages/admin/AdminCostDetailPage"));
const AdminLandingPagePage = lazy(() => import("./pages/admin/AdminLandingPagePage"));
const AdminLandingGeneratorPage = lazy(() => import("./pages/admin/AdminLandingGeneratorPage"));
const AdminSuppliersPage = lazy(() => import("./pages/admin/AdminSuppliersPage"));
const AdminSupplierDetailPage = lazy(() => import("./pages/admin/AdminSupplierDetailPage"));
const AdminSupplierTransactionCreatePage = lazy(() => import("./pages/admin/AdminSupplierTransactionCreatePage"));
const AdminClientsPage = lazy(() => import("./pages/admin/AdminClientsPage"));
const AdminClientDetailPage = lazy(() => import("./pages/admin/AdminClientDetailPage"));
const AdminCreateOrderPage = lazy(() => import("./pages/admin/AdminCreateOrderPage"));
const AdminStatisticsPage = lazy(() => import("./pages/admin/AdminStatisticsPage"));
const AdminDeliveryPage = lazy(() => import("./pages/admin/settings/AdminDeliveryPage"));
const AdminPixelsPage = lazy(() => import("./pages/admin/settings/AdminPixelsPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));
const FAQPage = lazy(() => import("./pages/FAQPage"));
const CategoriesPage = lazy(() => import("./pages/CategoriesPage"));
const LandingPage = lazy(() => import("./pages/LandingPage"));
const PublicGeneratedLandingPage = lazy(() => import("./pages/PublicGeneratedLandingPage"));

const NotFound = lazy(() => import("./pages/NotFound"));
const ConfirmerLayout = lazy(() => import("./components/ConfirmerLayout"));
const ConfirmerDashboardPage = lazy(() => import("./pages/confirmer/ConfirmerDashboardPage"));

import { useStoreTheme } from "@/hooks/useStoreTheme";
import { useFavicon } from "@/hooks/useFavicon";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { LanguageProvider } from "@/i18n";
import OfflineBanner from "@/components/OfflineBanner";
import { useOfflineSync } from "@/hooks/useOfflineSync";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function StoreThemeProvider({ children }: { children: React.ReactNode }) {
  useStoreTheme();
  useFavicon();
  useFacebookPixel();
  useOfflineSync();
  return <>{children}</>;
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <TopMarquee />
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <ScrollToTop />
      <WhatsAppFloat />
    </div>

  );
}


const RouteFallback = () => (
  <div className="min-h-[60vh] flex items-center justify-center">
    <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
      
      <StoreThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineBanner />
        <LanguageProvider>
        
        <BrowserRouter>
          <ScrollToTopOnRouteChange />
          <Suspense fallback={<RouteFallback />}>
          <Routes>
            {/* Public */}
            <Route path="/" element={<PublicLayout><Index /></PublicLayout>} />
            <Route path="/products" element={<PublicLayout><ProductsPage /></PublicLayout>} />
            <Route path="/product/:id" element={<PublicLayout><SingleProductPage /></PublicLayout>} />
            <Route path="/cart" element={<PublicLayout><CartPage /></PublicLayout>} />
            <Route path="/checkout" element={<PublicLayout><CheckoutPage /></PublicLayout>} />
            <Route path="/order-confirmation/:orderNumber" element={<PublicLayout><OrderConfirmationPage /></PublicLayout>} />
            <Route path="/track" element={<PublicLayout><TrackOrderPage /></PublicLayout>} />
            <Route path="/auth" element={<PublicLayout><AuthPage /></PublicLayout>} />
            <Route path="/dashboard" element={<PublicLayout><CustomerDashboardPage /></PublicLayout>} />
            <Route path="/about" element={<PublicLayout><AboutPage /></PublicLayout>} />
            <Route path="/faq" element={<PublicLayout><FAQPage /></PublicLayout>} />
            <Route path="/categories" element={<PublicLayout><CategoriesPage /></PublicLayout>} />
            
            <Route path="/lp/:id" element={<LandingPage />} />
            <Route path="/g/:id" element={<PublicGeneratedLandingPage />} />

            {/* Admin */}
            <Route path="/nuvoria-store/login" element={<LanguageProvider><AdminLoginPage /></LanguageProvider>} />
            <Route path="/admin" element={<LanguageProvider><AdminLayout><AdminDashboardPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/products" element={<LanguageProvider><AdminLayout><AdminProductsPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/orders" element={<LanguageProvider><AdminLayout><AdminOrdersPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/orders/create" element={<LanguageProvider><AdminLayout><AdminCreateOrderPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/statistics" element={<LanguageProvider><AdminLayout><AdminStatisticsPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/returns" element={<LanguageProvider><AdminLayout><AdminReturnsPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/wilayas" element={<LanguageProvider><AdminLayout><AdminWilayasPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/coupons" element={<LanguageProvider><AdminLayout><AdminCouponsPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/categories" element={<LanguageProvider><AdminLayout><AdminCategoriesPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/brands" element={<LanguageProvider><AdminLayout><AdminBrandsPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/variations" element={<LanguageProvider><AdminLayout><AdminVariationsPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/leads" element={<LanguageProvider><AdminLayout><AdminLeadsPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/abandoned" element={<LanguageProvider><AdminLayout><AdminAbandonedPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/inventory" element={<LanguageProvider><AdminLayout><AdminInventoryPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/confirmers" element={<LanguageProvider><AdminLayout><AdminConfirmersPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/costs" element={<LanguageProvider><AdminLayout><AdminCostsPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/costs/:productId" element={<LanguageProvider><AdminLayout><AdminCostDetailPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/landing" element={<LanguageProvider><AdminLayout><AdminLandingPagePage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/landing-generator" element={<LanguageProvider><AdminLayout><AdminLandingGeneratorPage /></AdminLayout></LanguageProvider>} />

            <Route path="/admin/suppliers" element={<LanguageProvider><AdminLayout><AdminSuppliersPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/suppliers/:id" element={<LanguageProvider><AdminLayout><AdminSupplierDetailPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/suppliers/:id/transactions/new" element={<LanguageProvider><AdminLayout><AdminSupplierTransactionCreatePage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/clients" element={<LanguageProvider><AdminLayout><AdminClientsPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/clients/:id" element={<LanguageProvider><AdminLayout><AdminClientDetailPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/delivery" element={<LanguageProvider><AdminLayout><AdminDeliveryPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/settings" element={<LanguageProvider><AdminLayout><AdminSettingsPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/settings/identity" element={<LanguageProvider><AdminLayout><AdminIdentityPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/settings/payment" element={<LanguageProvider><AdminLayout><AdminPaymentPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/settings/telegram" element={<LanguageProvider><AdminLayout><AdminTelegramPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/settings/returns" element={<LanguageProvider><AdminLayout><AdminReturnsSettingsPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/settings/form" element={<LanguageProvider><AdminLayout><AdminFormSettingsPage /></AdminLayout></LanguageProvider>} />
            
            <Route path="/admin/settings/security" element={<LanguageProvider><AdminLayout><AdminSecurityPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/settings/pixels" element={<LanguageProvider><AdminLayout><AdminPixelsPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/settings/delivery" element={<LanguageProvider><AdminLayout><AdminDeliveryPage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/settings/homepage" element={<LanguageProvider><AdminLayout><AdminHomepagePage /></AdminLayout></LanguageProvider>} />
            <Route path="/admin/settings/faq" element={<LanguageProvider><AdminLayout><AdminFAQPage /></AdminLayout></LanguageProvider>} />

            {/* Confirmer */}
            <Route path="/confirmer" element={<LanguageProvider><ConfirmerLayout><ConfirmerDashboardPage /></ConfirmerLayout></LanguageProvider>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
        </LanguageProvider>
      </TooltipProvider>
      </StoreThemeProvider>
      
    </CartProvider>
  </QueryClientProvider>
);

export default App;
