import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
    site: "https://penumbra.hackclub.com",
    scopedStyleStrategy: "class",
    devToolbar: { enabled: false }
});
