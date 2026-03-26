import { useEffect, useMemo, useState } from "react"

import { isUiLocale, type UiLocale } from "@/data/trait-catalog"
import { enMessages, type LocaleMessages } from "@/i18n/locales/en"
import { zhCnMessages } from "@/i18n/locales/zh-CN"

const STORAGE_KEY = "trait-aggregator-ui-locale"
const localeMessages: Record<UiLocale, LocaleMessages> = {
  en: enMessages,
  "zh-CN": zhCnMessages,
}

const SITE_TITLE: Record<UiLocale, string> = {
  en: "Trait | HagiCode",
  "zh-CN": "Trait | HagiCode",
}

const SITE_DESCRIPTION: Record<UiLocale, string> = {
  en: "Trait is a searchable HagiCode workspace for browsing audited agent catalogs, source summaries, and contextual detail views.",
  "zh-CN": "Trait 是一个可搜索的 HagiCode 工作台，用于浏览可追溯的 Agent 目录、来源摘要和按需展开的详情视图。",
}

function updateDocumentHead(locale: UiLocale) {
  const title = SITE_TITLE[locale]
  const description = SITE_DESCRIPTION[locale]
  const ogLocale = locale === "zh-CN" ? "zh_CN" : "en_US"
  const ogLocaleAlt = locale === "zh-CN" ? "en_US" : "zh_CN"

  document.documentElement.lang = locale === "zh-CN" ? "zh-CN" : "en"
  document.title = title

  const updates: [string, string, string][] = [
    ["name", "description", description],
    ["property", "og:title", title],
    ["property", "og:description", description],
    ["property", "og:locale", ogLocale],
    ["property", "og:locale:alternate", ogLocaleAlt],
    ["name", "twitter:title", title],
    ["name", "twitter:description", description],
  ]

  for (const [attr, key, content] of updates) {
    const selector = attr === "name"
      ? `meta[name="${key}"]`
      : `meta[property="${key}"]`
    document.querySelector(selector)?.setAttribute("content", content)
  }
}

function readInitialLocale(): UiLocale {
  if (typeof window === "undefined") {
    return "zh-CN"
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (isUiLocale(stored)) {
    return stored
  }

  const browserLocale = window.navigator.language
  return browserLocale.startsWith("zh") ? "zh-CN" : "en"
}

export function useLocale() {
  const [locale, setLocaleState] = useState<UiLocale>(() => readInitialLocale())

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, locale)
    updateDocumentHead(locale)
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
