import { defineConfig } from "astro/config";

import svelte from "@astrojs/svelte";
import playformCompress from "@playform/compress";

// https://astro.build/config
export default defineConfig({
  site: "https://penumbra.hackclub.com",
  scopedStyleStrategy: "class",
  devToolbar: { enabled: false },
  integrations: [svelte(), playformCompress()]
});