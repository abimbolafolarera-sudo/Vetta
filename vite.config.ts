import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The Vercel + Supabase connection sets SUPABASE_URL and the public key under a few names.
// Only these two public values reach the browser. Database passwords and secret keys never do.
const e = process.env;
const supabaseUrl = e.VITE_SUPABASE_URL || e.SUPABASE_URL || e.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = e.VITE_SUPABASE_ANON_KEY || e.SUPABASE_ANON_KEY || e.NEXT_PUBLIC_SUPABASE_ANON_KEY
  || e.SUPABASE_PUBLISHABLE_KEY || e.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

export default defineConfig({
  plugins: [react()],
  base: e.VITE_HASH_ROUTER ? "./" : "/",
  define: e.VITE_DEMO ? {} : {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabaseKey),
    "import.meta.env.VITE_PAYSTACK_PUBLIC_KEY": JSON.stringify(e.VITE_PAYSTACK_PUBLIC_KEY || e.PAYSTACK_PUBLIC_KEY || ""),
  },
});
