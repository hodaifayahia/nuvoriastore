import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import "@fontsource/space-grotesk/400.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import "@fontsource/space-grotesk/700.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import App from "./App.tsx";
import "./index.css";
import { supabase } from "@/integrations/supabase/client";

// Dynamic favicon from store settings
Promise.all([
  supabase.from('settings').select('value').eq('key', 'store_favicon').maybeSingle(),
  supabase.from('settings').select('value').eq('key', 'store_logo').maybeSingle(),
]).then(([faviconRes, logoRes]) => {
  const href = faviconRes.data?.value || logoRes.data?.value || '/nuvoriastore-logo.jpg';
  const link = document.getElementById('dynamic-favicon') as HTMLLinkElement | null;
  if (link) {
    link.href = href;
    link.type = href.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
  }
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider><App /></HelmetProvider>
);
