import { useEffect, useMemo, useState } from "react"

import { DEFAULT_UI_LOCALE, resolveUiLocale, type UiLocale } from "@/data/trait-catalog"
import { deDEMessages } from "@/i18n/locales/de-DE"
import { enMessages, type LocaleMessages } from "@/i18n/locales/en"
import { esESMessages } from "@/i18n/locales/es-ES"
import { frFRMessages } from "@/i18n/locales/fr-FR"
import { jaJPMessages } from "@/i18n/locales/ja-JP"
import { koKRMessages } from "@/i18n/locales/ko-KR"
import { ptBRMessages } from "@/i18n/locales/pt-BR"
import { ruRUMessages } from "@/i18n/locales/ru-RU"
import { zhHantMessages } from "@/i18n/locales/zh-Hant"
import { zhCnMessages } from "@/i18n/locales/zh-CN"

const STORAGE_KEY = "trait-ui-locale"
const localeMessages: Record<UiLocale, LocaleMessages> = {
  en: enMessages,
  "zh-CN": zhCnMessages,
  "zh-Hant": zhHantMessages,
  "ja-JP": jaJPMessages,
  "ko-KR": koKRMessages,
  "de-DE": deDEMessages,
  "fr-FR": frFRMessages,
  "es-ES": esESMessages,
  "pt-BR": ptBRMessages,
  "ru-RU": ruRUMessages,
}

export type UseLocaleOptions = {
  initializationMode?: "stored-preferred" | "explicit-preferred"
}

function readInitialLocale(
  preferredLocale?: UiLocale,
  initializationMode: UseLocaleOptions["initializationMode"] = "stored-preferred"
): UiLocale {
  if (typeof window === "undefined") {
    return preferredLocale ?? DEFAULT_UI_LOCALE
  }

  if (initializationMode === "explicit-preferred" && preferredLocale) {
    return preferredLocale
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  const resolvedStoredLocale = resolveUiLocale(stored)
  if (resolvedStoredLocale) {
    return resolvedStoredLocale
  }

  if (preferredLocale) {
    return preferredLocale
  }

  const detectedLocale = resolveUiLocale(window.navigator.language)
  if (detectedLocale) {
    return detectedLocale
  }

  return DEFAULT_UI_LOCALE
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
