// Per-entry JSON for the listing drawer: dist/data/agents/<agentId>.json.
import type { APIRoute } from "astro"

import { buildDetailPayload, loadCatalogSnapshot } from "@/lib/catalog-loader"

export function getStaticPaths() {
  return loadCatalogSnapshot().items.map((item) => ({ params: { agentId: item.agentId } }))
}

export const GET: APIRoute = ({ params }) => {
  const payload = buildDetailPayload(String(params.agentId), loadCatalogSnapshot())

  if (!payload) {
    return new Response("Not found", { status: 404 })
  }

  return new Response(JSON.stringify(payload), {
    headers: { "content-type": "application/json; charset=utf-8" },
  })
}
