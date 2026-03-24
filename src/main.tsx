import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import App from "./App"
import "./index.css"
import { bootstrapAnalytics } from "./lib/analytics/bootstrap"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
)

void bootstrapAnalytics().catch((error) => {
  console.warn("[51LA Analytics] Bootstrap failed", error)
})
