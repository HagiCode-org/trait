import path from "node:path"

import { defineConfig } from "astro/config"
import react from "@astrojs/react"
import tailwindcss from "@tailwindcss/vite"
import { hagilight } from "@hagicode/hagilight/integration"

export default defineConfig({
  site: "https://trait.hagicode.com",
  output: "static",
  integrations: [react(), hagilight()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve("./src"),
      },
    },
  },
})
