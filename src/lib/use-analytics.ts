import { useEffect } from "react"

import { bootstrapAnalytics } from "@/lib/analytics/bootstrap"

export function useAnalyticsBootstrap() {
  useEffect(() => {
    void bootstrapAnalytics().catch((error) => {
      console.warn("[51LA Analytics] Bootstrap failed", error)
    })
  }, [])
}
