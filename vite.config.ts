import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const port = Number(process.env.PORT) || 5173;
const basePath = process.env.BASE_PATH || "/";

// Replit-only dev tooling. These packages ship with the Repl and are loaded
// dynamically so local dev (Claude Code / plain `npm run dev`) never needs them
// and never breaks if they're absent. They activate only inside a Repl.
async function replitPlugins(): Promise<PluginOption[]> {
  if (!process.env.REPL_ID) return [];
  const plugins: PluginOption[] = [];
  try {
    const { default: runtimeErrorOverlay } = await import(
      "@replit/vite-plugin-runtime-error-modal"
    );
    plugins.push(runtimeErrorOverlay());
  } catch {}
  if (process.env.NODE_ENV !== "production") {
    try {
      const { cartographer } = await import(
        "@replit/vite-plugin-cartographer"
      );
      plugins.push(cartographer({ root: path.resolve(import.meta.dirname, "..") }));
    } catch {}
    try {
      const { devBanner } = await import("@replit/vite-plugin-dev-banner");
      plugins.push(devBanner());
    } catch {}
  }
  return plugins;
}

export default defineConfig(async () => ({
  base: basePath,
  plugins: [react(), tailwindcss(), ...(await replitPlugins())],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: false,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: { strict: true },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
}));
