import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { buildTraitTemplateSnapshot, writeTraitTemplateSnapshot } from './generate-agent-templates.mjs';

const tempRoots = [];

async function createSourceFixture(items) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'trait-agent-templates-'));
  tempRoots.push(root);
  const sourcePath = path.join(root, 'agent-catalog.json');
  await fs.writeFile(sourcePath, JSON.stringify({ items }, null, 2), 'utf8');
  return { root, sourcePath };
}

describe('generate-agent-templates', () => {
  afterEach(async () => {
    await Promise.all(tempRoots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  it('emits stable ids, full fields, grouped tags, and preview content', async () => {
    const { sourcePath } = await createSourceFixture([
      {
        traitCatalogId: 'trait-typescript-architect',
        agentId: 'trait-typescript-architect',
        sourceAgentId: 'trait-typescript-architect',
        name: 'TypeScript Architect',
        summary: 'Designs frontend and backend systems with TypeScript.',
        type: 'architect',
        tags: ['typescript', 'frontend', 'backend', 'architecture'],
        sourceUrl: 'https://example.com/trait',
        defaultLanguage: 'en',
        variants: {
          en: {
            bodyPlainText: 'Review runtime boundaries before implementation.',
          },
        },
      },
    ]);

    const snapshot = await buildTraitTemplateSnapshot({
      sourcePath,
      generatedAt: '2026-03-26T12:00:00.000Z',
    });

    expect(snapshot.index.templateType).toBe('trait');
    expect(snapshot.details[0]).toMatchObject({
      id: 'trait-typescript-architect',
      templateType: 'trait',
      name: 'TypeScript Architect',
      summary: 'Designs frontend and backend systems with TypeScript.',
      prompt: 'Review runtime boundaries before implementation.',
      previewText: 'Review runtime boundaries before implementation.',
      path: '/agent-templates/trait/templates/trait-typescript-architect.json',
      tagGroups: {
        languages: expect.arrayContaining(['typescript']),
        domains: expect.arrayContaining(['architecture', 'backend', 'frontend']),
        roles: expect.arrayContaining(['architect']),
      },
      tags: expect.arrayContaining(['trait', 'typescript', 'architecture']),
    });
    expect(snapshot.index.availableTagGroups.languages).toContain('typescript');
  });

  it('falls back to empty tag arrays when no groups can be inferred', async () => {
    const { sourcePath } = await createSourceFixture([
      {
        traitCatalogId: 'trait-plain-note',
        agentId: 'trait-plain-note',
        sourceAgentId: 'trait-plain-note',
        name: 'Plain Note',
        summary: 'Keeps the prompt concise.',
        type: 'note',
        tags: [],
        defaultLanguage: 'en',
        variants: {
          en: {
            bodyPlainText: 'Stay concise.',
          },
        },
      },
    ]);

    const snapshot = await buildTraitTemplateSnapshot({ sourcePath });

    expect(snapshot.details[0].tagGroups).toEqual({
      languages: [],
      domains: [],
      roles: [],
    });
    expect(snapshot.index.availableTagGroups).toEqual({
      languages: [],
      domains: [],
      roles: [],
    });
  });

  it('writes index and detail files to the canonical output directory', async () => {
    const { root, sourcePath } = await createSourceFixture([
      {
        traitCatalogId: 'trait-python-reviewer',
        agentId: 'trait-python-reviewer',
        sourceAgentId: 'trait-python-reviewer',
        name: 'Python Reviewer',
        summary: 'Focuses on Python code review and test risks.',
        type: 'reviewer',
        tags: ['python', 'testing'],
        defaultLanguage: 'en',
        variants: {
          en: {
            bodyPlainText: 'Review edge cases before merge.',
          },
        },
      },
    ]);

    const outputDirectory = path.join(root, 'out');
    await writeTraitTemplateSnapshot({ sourcePath, outputDirectory, generatedAt: '2026-03-26T12:00:00.000Z' });

    const index = JSON.parse(await fs.readFile(path.join(outputDirectory, 'index.json'), 'utf8'));
    const detail = JSON.parse(await fs.readFile(path.join(outputDirectory, 'templates', 'trait-python-reviewer.json'), 'utf8'));

    expect(index.templates).toHaveLength(1);
    expect(detail.prompt).toBe('Review edge cases before merge.');
  });
});
