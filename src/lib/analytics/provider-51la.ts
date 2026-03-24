export const DEFAULT_51LA_ID = "L6b88a5yK4h2Xnci"
export const FIFTY_ONE_LA_READY_EVENT = "hagicode:analytics-ready"
export const FIFTY_ONE_LA_SDK_SRC = "//sdk.51.la/js-sdk-pro.min.js"

const DEFAULT_51LA_INIT_FLAGS = {
  autoTrack: true,
  hashMode: true,
  screenRecord: true,
} as const

export interface AnalyticsEnvironment {
  PROD: boolean
  VITE_51LA_ID?: string
  VITE_51LA_DEBUG?: string
}

export interface FiftyOneLAInitOptions {
  id: string
  ck: string
  autoTrack: boolean
  hashMode: boolean
  screenRecord: boolean
}

export interface FiftyOneLAWindow extends Window {
  LA?: {
    init: (options: FiftyOneLAInitOptions) => void
  }
}

function logDebug(debugEnabled: boolean, message: string, details?: unknown) {
  if (!debugEnabled) {
    return
  }

  if (typeof details === "undefined") {
    console.log(`[51LA Analytics] ${message}`)
    return
  }

  console.log(`[51LA Analytics] ${message}`, details)
}

export function resolve51LAConfig(env: AnalyticsEnvironment) {
  const id = env.VITE_51LA_ID || DEFAULT_51LA_ID
  const debug = Boolean(env.VITE_51LA_DEBUG)

  return {
    enabled: env.PROD,
    debug,
    id,
    initOptions: {
      id,
      ck: id,
      ...DEFAULT_51LA_INIT_FLAGS,
    } satisfies FiftyOneLAInitOptions,
  }
}

export function initialize51LA(windowLike: FiftyOneLAWindow, env: AnalyticsEnvironment) {
  const config = resolve51LAConfig(env)
  const sdk = windowLike.LA

  if (!sdk || typeof sdk.init !== "function") {
    logDebug(config.debug, "SDK unavailable, skipping initialization")
    return false
  }

  try {
    sdk.init(config.initOptions)
    windowLike.dispatchEvent(new Event(FIFTY_ONE_LA_READY_EVENT))
    logDebug(config.debug, "Initialized SDK", {
      id: `***${config.id.slice(-4)}`,
    })
    return true
  } catch (error) {
    console.warn("[51LA Analytics] Failed to initialize SDK", error)
    return false
  }
}
