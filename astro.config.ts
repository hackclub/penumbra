import { defineConfig } from "astro/config";

import svelte from "@astrojs/svelte";

// https://astro.build/config
export default defineConfig({
  site: "https://penumbra.hackclub.com",
  scopedStyleStrategy: "class",
  devToolbar: { enabled: false },
  integrations: [svelte()],
  vite: {
    optimizeDeps: { include: ["monaco-editor"] },
    css: {
      preprocessorOptions: {}
    }
  }
});