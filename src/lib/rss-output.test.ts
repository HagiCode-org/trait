import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const dist = resolve(process.cwd(), 'dist');

function assertEmptyFeed(xml: string) {
  expect(xml).toMatch(/^<\?xml/u);
  const channel = xml.match(/<channel>([\s\S]*?)<\/channel>/u)?.[1];
  expect(channel).toBeDefined();
  if (!channel) throw new Error('Expected an RSS channel');
  expect(channel).toMatch(/<title>[^<]+<\/title>/u);
  expect(channel).toMatch(/<description>[^<]+<\/description>/u);
  expect(channel).toContain('<language>en</language>');
  expect(channel).toContain('<link>https://trait.hagicode.com/</link>');
  expect(xml).not.toMatch(/<item>/u);
}

describe('built-in RSS output', () => {
  it('publishes equivalent empty root and English feeds linked by the shared footer', () => {
    const rootFeed = readFileSync(resolve(dist, 'rss.xml'), 'utf8');
    const englishAlias = readFileSync(resolve(dist, 'rss.en.xml'), 'utf8');
    const homepage = readFileSync(resolve(dist, 'index.html'), 'utf8');

    assertEmptyFeed(rootFeed);
    assertEmptyFeed(englishAlias);
    expect(rootFeed).toBe(englishAlias);
    expect(homepage).toContain('https://trait.hagicode.com/rss.xml');
    expect(homepage).toContain('https://trait.hagicode.com/rss.xml');
  });
});
