import {
  FIFTY_ONE_LA_SDK_SRC,
  initialize51LA,
  resolve51LAConfig,
  type AnalyticsEnvironment,
  type FiftyOneLAWindow,
} from "./provider-51la"

const FIFTY_ONE_LA_SCRIPT_ID = "LA_COLLECT"

interface BootstrapAnalyticsOptions {
  windowLike?: FiftyOneLAWindow
  documentLike?: Document
  env?: AnalyticsEnvironment
}

function observeSdkLoad(script: HTMLScriptElement, windowLike: FiftyOneLAWindow, env: AnalyticsEnvironment) {
  return new Promise<boolean>((resolve) => {
    if (script.dataset.loadStatus === "loaded") {
      resolve(initialize51LA(windowLike, env))
      return
    }

    if (script.dataset.loadStatus === "error") {
      resolve(false)
      return
    }

    const cleanup = () => {
      script.removeEventListener("load", handleLoad)
      script.removeEventListener("error", handleError)
    }

    const handleLoad = () => {
      script.dataset.loadStatus = "loaded"
      cleanup()
      resolve(initialize51LA(windowLike, env))
    }

    const handleError = () => {
      script.dataset.loadStatus = "error"
      cleanup()
      console.warn("[51LA Analytics] Failed to load SDK script")
      resolve(false)
    }

    script.addEventListener("load", handleLoad)
    script.addEventListener("error", handleError)
  })
}

export async function bootstrapAnalytics(options: BootstrapAnalyticsOptions = {}) {
  const env = options.env ?? (import.meta.env as AnalyticsEnvironment)
  const config = resolve51LAConfig(env)

  if (!config.enabled) {
    return false
  }

  const windowLike = options.windowLike ?? (window as FiftyOneLAWindow)
  const documentLike = options.documentLike ?? document

  if (initialize51LA(windowLike, env)) {
    return true
  }

  try {
    const existingScript = documentLike.getElementById(FIFTY_ONE_LA_SCRIPT_ID) as HTMLScriptElement | null
    if (existingScript) {
      return await observeSdkLoad(existingScript, windowLike, env)
    }

    const script = documentLike.createElement("script")
    script.id = FIFTY_ONE_LA_SCRIPT_ID
    script.charset = "UTF-8"
    script.src = FIFTY_ONE_LA_SDK_SRC
    script.async = true

    documentLike.head.appendChild(script)

    return await observeSdkLoad(script, windowLike, env)
  } catch (error) {
    console.warn("[51LA Analytics] Bootstrap failed", error)
    return false
  }
}
