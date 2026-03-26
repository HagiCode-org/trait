import { useEffect, useMemo, useState } from "react"

import { isUiLocale, type UiLocale } from "@/data/trait-catalog"
import { enMessages, type LocaleMessages } from "@/i18n/locales/en"
import { zhCnMessages } from "@/i18n/locales/zh-CN"

const STORAGE_KEY = "trait-ui-locale"
const localeMessages: Record<UiLocale, LocaleMessages> = {
  en: enMessages,
  "zh-CN": zhCnMessages,
}

export type UseLocaleOptions = {
  initializationMode?: "stored-preferred" | "explicit-preferred"
}

function readInitialLocale(
  preferredLocale?: UiLocale,
  initializationMode: UseLocaleOptions["initializationMode"] = "stored-preferred"
): UiLocale {
  if (typeof window === "undefined") {
    return preferredLocale ?? "en"
  }

  if (initializationMode === "explicit-preferred" && preferredLocale) {
    return preferredLocale
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (isUiLocale(stored)) {
    return stored
  }

  if (preferredLocale) {
    return preferredLocale
  }

  return window.navigator.language.startsWith("zh") ? "zh-CN" : "en"
}

export function useLocale(preferredLocale?: UiLocale, options?: UseLocaleOptions) {
  const [locale, setLocaleState] = useState<UiLocale>(() =>
    readInitialLocale(preferredLocale, options?.initializationMode)
  )

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale)
  }, [locale])

  const messages = useMemo(() => localeMessages[locale], [locale])

  function setLocale(nextLocale: UiLocale) {
    setLocaleState(nextLocale)
  }

  return {
    locale,
    messages,
    setLocale,
  }
}

export function formatMessage(template: string, values: Record<string, string | number>) {
  return Object.entries(values).reduce(
    (message, [key, value]) => message.replace(`{{${key}}}`, String(value)),
    template
  )
}
