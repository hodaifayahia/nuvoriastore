import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

// Build-time verifier: scans emitted JS bundles for the public Supabase URL
// and publishable key. Fails the build if either is missing so we never ship
// a bundle that throws "supabaseUrl is required" at runtime.
function verifySupabaseInBundle(expected: { url: string; key: string }): Plugin {
  return {
    name: "verify-supabase-in-bundle",
    apply: "build",
    closeBundle() {
      const distAssets = path.resolve(process.cwd(), "dist", "assets");
      if (!fs.existsSync(distAssets)) return;
      const files = fs
        .readdirSync(distAssets)
        .filter((f) => f.endsWith(".js"))
        .map((f) => path.join(distAssets, f));
      const haystack = files.map((f) => fs.readFileSync(f, "utf8")).join("\n");
      const missing: string[] = [];
      if (!haystack.includes(expected.url)) missing.push("VITE_SUPABASE_URL");
      // Match just a stable prefix of the JWT to avoid false negatives from chunk splits.
      if (!haystack.includes(expected.key.slice(0, 40))) missing.push("VITE_SUPABASE_PUBLISHABLE_KEY");
      if (missing.length > 0) {
        throw new Error(
          `[verify-supabase-in-bundle] Missing in built bundle: ${missing.join(", ")}. ` +
            `Ensure .env has VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY set before building.`,
        );
      }
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl =
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    "https://ttjjmgryxpbqokctfvox.supabase.co";
  const supabasePublishableKey =
    env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_PUBLISHABLE_KEY ||
    env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR0amptZ3J5eHBicW9rY3Rmdm94Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIyNDU4MzUsImV4cCI6MjA5NzgyMTgzNX0.slXWy0LhD7sVMrIaWfUWY1eYvMYqpRgzUeZWC0LEipY";

  return {
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(supabasePublishableKey),
    },
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      mode !== "development" &&
        verifySupabaseInBundle({ url: supabaseUrl, key: supabasePublishableKey }),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      // Explicit cache-busting: hashed filenames for every emitted asset so
      // old bundles (e.g. index-0a_Tq462.js) can never be re-served stale.
      rollupOptions: {
        output: {
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash][extname]",
        },
      },
    },
  };
});
