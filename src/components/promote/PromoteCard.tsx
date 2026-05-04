import { useEffect, useState } from 'react';

import { resolveUiLocale } from '@/data/trait-catalog';
import { loadFirstActivePromotion, type ActivePromotion } from '@/lib/promote-loader';

type PromoteCardProps = {
  locale?: string;
  fetchImpl?: typeof fetch;
  className?: string;
  initialPromotion?: ActivePromotion | null;
  footerSelector?: string;
};

const DEFAULT_FOOTER_SELECTOR = 'footer, [data-footer-root], .footer';
const DISMISSED_PROMOTIONS_STORAGE_KEY = 'hagicode:promote-card:dismissed-signature';
const TRAIT_UI_LOCALE_STORAGE_KEY = 'trait-ui-locale';

function platformLabel(platform: string | null, locale: string | undefined) {
  if (platform) return platform;
  return locale?.toLowerCase().startsWith('zh') ? '推荐' : 'Promoted';
}

function closeLabel(locale: string | undefined) {
  if (locale?.toLowerCase().startsWith('zh-hant') || locale === 'zh-HK' || locale === 'zh-TW') {
    return '關閉推廣資訊';
  }

  return locale?.toLowerCase().startsWith('zh') ? '关闭推广信息' : 'Dismiss promotion';
}

function closeText(locale: string | undefined) {
  if (locale?.toLowerCase().startsWith('zh-hant') || locale === 'zh-HK' || locale === 'zh-TW') {
    return '關閉';
  }

  return locale?.toLowerCase().startsWith('zh') ? '关闭' : 'Close';
}

function readStoredLocale(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.localStorage.getItem(TRAIT_UI_LOCALE_STORAGE_KEY);
    return resolveUiLocale(stored);
  } catch {
    return null;
  }
}

function readDocumentLocale(fallback: string): string {
  if (typeof document === 'undefined') return fallback;
  return (readStoredLocale() ?? document.documentElement.lang) || fallback;
}

function readDismissedSignature(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(DISMISSED_PROMOTIONS_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeDismissedSignature(signature: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DISMISSED_PROMOTIONS_STORAGE_KEY, signature);
  } catch {
    // Ignore unavailable storage; closing still works for this render.
  }
}

export function PromoteCard({
  locale = 'en',
  fetchImpl,
  className,
  initialPromotion = null,
  footerSelector = DEFAULT_FOOTER_SELECTOR,
}: PromoteCardProps) {
  const [effectiveLocale, setEffectiveLocale] = useState(() => readDocumentLocale(locale));
  const [promotion, setPromotion] = useState<ActivePromotion | null>(initialPromotion);
  const [footerVisible, setFooterVisible] = useState(false);
  const [dismissedSignature, setDismissedSignature] = useState<string | null>(() => readDismissedSignature());

  useEffect(() => {
    setEffectiveLocale(readDocumentLocale(locale));
  }, [locale]);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return;
    }

    const root = document.documentElement;
    const syncLocale = () => setEffectiveLocale(root.lang || locale);
    syncLocale();

    const observer = new MutationObserver(syncLocale);
    observer.observe(root, { attributeFilter: ['lang'] });
    return () => observer.disconnect();
  }, [locale]);

  useEffect(() => {
    if (initialPromotion) return;
    let cancelled = false;

    void loadFirstActivePromotion({ locale: effectiveLocale, fetchImpl }).then((nextPromotion) => {
      if (!cancelled) setPromotion(nextPromotion);
    });

    return () => {
      cancelled = true;
    };
  }, [effectiveLocale, fetchImpl, initialPromotion]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined' || !('IntersectionObserver' in window)) {
      return;
    }

    const footer = document.querySelector<HTMLElement>(footerSelector);
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(Boolean(entry?.isIntersecting)),
      { threshold: 0.01 },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, [footerSelector]);

  const promotionSignature = promotion?.id ?? null;
  const dismissed = Boolean(promotionSignature && dismissedSignature === promotionSignature);

  if (!promotion || footerVisible || dismissed) return null;

  const openPromotion = () => {
    window.open(promotion.link, '_blank', 'noopener,noreferrer');
  };

  const dismissPromotion = () => {
    if (!promotionSignature) return;
    writeDismissedSignature(promotionSignature);
    setDismissedSignature(promotionSignature);
  };

  return (
    <section
      className={className}
      data-promote-card
      data-promote-card-layout="compact"
      aria-label={effectiveLocale.toLowerCase().startsWith('zh') ? '推广信息' : 'Promotion'}
    >
      <div className="promote-card__inner" data-promote-card-shell="compact">
        <button type="button" className="promote-card__close" onClick={dismissPromotion} aria-label={closeLabel(effectiveLocale)}>
          <span className="promote-card__close-icon" aria-hidden="true">×</span>
          <span className="promote-card__close-label">{closeText(effectiveLocale)}</span>
        </button>
        <button
          type="button"
          className="promote-card__surface"
          data-has-image={promotion.image ? 'true' : 'false'}
          onClick={openPromotion}
          aria-label={`${promotion.ctaLabel}: ${promotion.title}`}
        >
          <span className="promote-card__body">
            <span className="promote-card__badge">{platformLabel(promotion.platform, effectiveLocale)}</span>
            <span className="promote-card__title">{promotion.title}</span>
            <span className="promote-card__description">{promotion.description}</span>
          </span>
          {promotion.image?.src ? (
            <span className="promote-card__media">
              <img
                className="promote-card__image"
                src={promotion.image.src}
                alt={promotion.image.alt || promotion.title}
                loading="eager"
                decoding="async"
                width={promotion.image.width}
                height={promotion.image.height}
              />
            </span>
          ) : null}
          <span className="promote-card__cta" aria-hidden="true">{promotion.ctaLabel}</span>
        </button>
      </div>
    </section>
  );
}
