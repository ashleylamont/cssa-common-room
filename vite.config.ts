import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import devtools from "solid-devtools/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [devtools(), tailwindcss(), solid()],
  server: {
    strictPort: true,
    port: 3000,
  },
});
