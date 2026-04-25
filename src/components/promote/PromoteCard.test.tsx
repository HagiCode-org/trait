/* @vitest-environment jsdom */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PromoteCard } from './PromoteCard';

const activePromotion = {
  id: 'p1',
  title: '立即添加到愿望单',
  description: '中文文案',
  link: 'https://example.invalid/one',
  platform: 'steam',
  ctaLabel: '加入愿望单',
};

describe('PromoteCard', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    document.documentElement.lang = '';
    vi.restoreAllMocks();
  });

  it('renders the first active promotion as a dismissible clickable card', () => {
    const markup = renderToStaticMarkup(
      <PromoteCard locale="zh-CN" className="test-promote" initialPromotion={activePromotion} />,
    );

    expect(markup).toContain('data-promote-card="true"');
    expect(markup).toContain('立即添加到愿望单');
    expect(markup).toContain('中文文案');
    expect(markup).toContain('promote-card__inner');
    expect(markup).toContain('promote-card__surface');
    expect(markup).toContain('promote-card__close');
    expect(markup).toContain('aria-label="关闭推广信息"');
    expect(markup).toContain('aria-label="加入愿望单: 立即添加到愿望单"');
  });

  it('renders nothing when no active promotion exists', () => {
    const markup = renderToStaticMarkup(<PromoteCard locale="en" initialPromotion={null} />);

    expect(markup).toBe('');
  });

  it('updates chrome labels and promotion copy when the document language changes', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = input.toString();
      if (url.endsWith('/index-catalog.json')) {
        return jsonResponse({ entries: [
          { id: 'promotion-flags', path: '/promote.json' },
          { id: 'promotion-content', path: '/promote_content.json' },
        ] });
      }
      if (url.endsWith('/promote.json')) {
        return jsonResponse({ promotes: [{ id: 'p1', on: true }] });
      }
      if (url.endsWith('/promote_content.json')) {
        return jsonResponse({ contents: [{
          id: 'p1',
          title: { en: 'Wishlist Now', zh: '立即添加到愿望单' },
          description: { en: 'English copy', zh: '中文文案' },
          cta: { en: 'Wishlist on Steam', zh: '加入愿望单' },
          link: 'https://example.invalid/one',
        }] });
      }
      throw new Error(`Unexpected URL: ${url}`);
    });

    document.documentElement.lang = 'en';
    const host = document.createElement('div');
    document.body.append(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(<PromoteCard locale="en" fetchImpl={fetchImpl as typeof fetch} />);
    });

    await vi.waitFor(() => expect(host.textContent).toContain('Wishlist Now'));
    expect(host.textContent).toContain('Wishlist on Steam');

    await act(async () => {
      document.documentElement.lang = 'zh-CN';
    });

    await vi.waitFor(() => expect(host.textContent).toContain('立即添加到愿望单'));
    expect(host.textContent).toContain('加入愿望单');

    await act(async () => {
      root.unmount();
    });
  });
});

function jsonResponse(payload: unknown) {
  return new Response(JSON.stringify(payload), { status: 200, headers: { 'content-type': 'application/json' } });
}
