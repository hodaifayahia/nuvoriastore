import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AnnouncementBar from "@/components/AnnouncementBar";
import ScrollToTop from "@/components/ScrollToTop";
import ScrollToTopOnRouteChange from "@/components/ScrollToTopOnRouteChange";
import WhatsAppFloat from "@/components/WhatsAppFloat";

import AdminLayout from "@/components/AdminLayout";
import Index from "./pages/Index";
import ProductsPage from "./pages/ProductsPage";
import SingleProductPage from "./pages/SingleProductPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderConfirmationPage from "./pages/OrderConfirmationPage";
import TrackOrderPage from "./pages/TrackOrderPage";
import AuthPage from "./pages/AuthPage";
import CustomerDashboardPage from "./pages/CustomerDashboardPage";
import AdminLoginPage from "./pages/admin/AdminLoginPage";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminWilayasPage from "./pages/admin/AdminWilayasPage";
import AdminCouponsPage from "./pages/admin/AdminCouponsPage";
import AdminCategoriesPage from "./pages/admin/AdminCategoriesPage";
import AdminBrandsPage from "./pages/admin/AdminBrandsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminIdentityPage from "./pages/admin/settings/AdminIdentityPage";
import AdminPaymentPage from "./pages/admin/settings/AdminPaymentPage";
import AdminTelegramPage from "./pages/admin/settings/AdminTelegramPage";
import AdminReturnsSettingsPage from "./pages/admin/settings/AdminReturnsSettingsPage";
import AdminFormSettingsPage from "./pages/admin/settings/AdminFormSettingsPage";

import AdminHomepagePage from "./pages/admin/settings/AdminHomepagePage";
import AdminFAQPage from "./pages/admin/settings/AdminFAQPage";
import AdminSecurityPage from "./pages/admin/settings/AdminSecurityPage";
import AdminLeadsPage from "./pages/admin/AdminLeadsPage";
import AdminVariationsPage from "./pages/admin/AdminVariationsPage";
import AdminAbandonedPage from "./pages/admin/AdminAbandonedPage";
import AdminInventoryPage from "./pages/admin/AdminInventoryPage";
import AdminConfirmersPage from "./pages/admin/AdminConfirmersPage";
import AdminReturnsPage from "./pages/admin/AdminReturnsPage";
import AdminCostsPage from "./pages/admin/AdminCostsPage";
import AdminCostDetailPage from "./pages/admin/AdminCostDetailPage";
import AdminLandingPagePage from "./pages/admin/AdminLandingPagePage";
import AdminLandingGeneratorPage from "./pages/admin/AdminLandingGeneratorPage";
import AdminSuppliersPage from "./pages/admin/AdminSuppliersPage";
import AdminSupplierDetailPage from "./pages/admin/AdminSupplierDetailPage";
import AdminSupplierTransactionCreatePage from "./pages/admin/AdminSupplierTransactionCreatePage";
import AdminClientsPage from "./pages/admin/AdminClientsPage";
import AdminClientDetailPage from "./pages/admin/AdminClientDetailPage";
import AdminCreateOrderPage from "./pages/admin/AdminCreateOrderPage";
import AdminStatisticsPage from "./pages/admin/AdminStatisticsPage";
import AdminDeliveryPage from "./pages/admin/settings/AdminDeliveryPage";
import AdminPixelsPage from "./pages/admin/settings/AdminPixelsPage";
import AboutPage from "./pages/AboutPage";
import FAQPage from "./pages/FAQPage";
import CategoriesPage from "./pages/CategoriesPage";
import LandingPage from "./pages/LandingPage";
import WishlistPage from "./pages/WishlistPage";
import NotFound from "./pages/NotFound";
import ConfirmerLayout from "./components/ConfirmerLayout";
import ConfirmerDashboardPage from "./pages/confirmer/ConfirmerDashboardPage";
import { useStoreTheme } from "@/hooks/useStoreTheme";
import { useFavicon } from "@/hooks/useFavicon";
import { useFacebookPixel } from "@/hooks/useFacebookPixel";
import { LanguageProvider } from "@/i18n";
import OfflineBanner from "@/components/OfflineBanner";
import { useOfflineSync } from "@/hooks/useOfflineSync";

const queryClient = new QueryClient();

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
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
      <ScrollToTop />
      <WhatsAppFloat />
    </div>

  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
      <WishlistProvider>
      <StoreThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <OfflineBanner />
        <LanguageProvider>
        
        <BrowserRouter>
          <ScrollToTopOnRouteChange />
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
            <Route path="/wishlist" element={<PublicLayout><WishlistPage /></PublicLayout>} />
            <Route path="/lp/:id" element={<LandingPage />} />
            <Route path="/g/:id" element={<PublicGeneratedLandingPage />} />

            {/* Admin */}
            <Route path="/akrem-control/login" element={<LanguageProvider><AdminLoginPage /></LanguageProvider>} />
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
        </BrowserRouter>
        </LanguageProvider>
      </TooltipProvider>
      </StoreThemeProvider>
      </WishlistProvider>
    </CartProvider>
  </QueryClientProvider>
);

export default App;
