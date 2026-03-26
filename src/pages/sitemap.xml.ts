import type { APIRoute } from "astro"

import { loadCatalogSnapshot } from "@/lib/catalog-loader"
import { buildAgentLanguagePath } from "@/lib/route-projection"
import { TRAIT_SITE_URL } from "@/lib/site-config"

export const GET: APIRoute = () => {
  const snapshot = loadCatalogSnapshot()
  const urls = [
    "/",
    "/agents/",
    ...snapshot.items.flatMap((item) =>
      item.availableLanguages.map((language) => buildAgentLanguagePath(item, language))
    ),
  ]

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls
    .map((pathname) => `\n  <url><loc>${new URL(pathname, TRAIT_SITE_URL).toString()}</loc></url>`)
    .join("")}\n</urlset>`

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
    },
  })
}
