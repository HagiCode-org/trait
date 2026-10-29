// Search shards: dist/data/search/<language>.<hash>.json, one per content language.
import type { APIRoute } from "astro"

import { buildSearchShards, loadCatalogSnapshot, searchShardFileName } from "@/lib/catalog-loader"

export function getStaticPaths() {
  return buildSearchShards(loadCatalogSnapshot()).map((shard) => ({
    params: { shard: searchShardFileName(shard) },
    props: { json: shard.json },
  }))
}

export const GET: APIRoute = ({ props }) =>
  new Response((props as { json: string }).json, {
    headers: { "content-type": "application/json; charset=utf-8" },
  })
