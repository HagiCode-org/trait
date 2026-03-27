import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const sourceCatalogPath = path.join(repoRoot, 'src', 'data', 'generated', 'agent-catalog.json');
const outputRoot = path.join(repoRoot, 'src', 'data', 'generated', 'agent-templates');
const typeIndexPath = path.join(outputRoot, 'index.json');
const templatesOutputDir = path.join(outputRoot, 'templates');

const LANGUAGE_PATTERNS = [
  ['typescript', /\btypescript\b|\bts\b/i],
  ['javascript', /\bjavascript\b|\bjs\b|node\.js|nodejs/i],
  ['python', /\bpython\b|\bpy\b/i],
  ['java', /\bjava\b/i],
  ['csharp', /c#|csharp|dotnet|asp\.net/i],
  ['go', /\bgo\b|golang/i],
  ['rust', /\brust\b/i],
  ['ruby', /\bruby\b|rails/i],
  ['php', /\bphp\b|laravel/i],
  ['swift', /\bswift\b|ios/i],
  ['kotlin', /\bkotlin\b|android/i],
  ['dart', /\bdart\b|flutter/i],
  ['sql', /\bsql\b|postgres|mysql|sqlite|database/i],
  ['cpp', /c\+\+|cpp/i],
  ['c', /(^|\W)c(\W|$)/i],
  ['bash', /bash|shell|terminal/i],
  ['powershell', /powershell/i],
  ['html', /\bhtml\b/i],
  ['css', /\bcss\b/i],
  ['react', /\breact\b|jsx/i],
  ['vue', /\bvue\b/i],
  ['angular', /\bangular\b/i],
  ['graphql', /graphql/i],
];

const DOMAIN_PATTERNS = [
  ['frontend', /frontend|ui|ux|css|html|react|vue|angular/i],
  ['backend', /backend|server|api|microservice|service|asp\.net|express|fastapi|django|spring/i],
  ['architecture', /architect|architecture|system design|design specialist|graphql architect|microservices/i],
  ['testing', /test|qa|quality|e2e|cypress|jest|vitest|automation/i],
  ['security', /security|auth|oauth|penetration|compliance|privacy|hardening/i],
  ['devops', /devops|sre|platform|cloud|deployment|docker|kubernetes|terraform|terragrunt|infra/i],
  ['data-ai', /\bdata\b|analytics|database|\bml\b|\bai\b|\bllm\b|\bnlp\b|postgres|vector/i],
  ['documentation', /docs|document|writer|content/i],
  ['product', /product|business|project manager|customer|sales|ux researcher|scrum/i],
  ['research', /research|trend|market|competitive|literature/i],
  ['mobile', /mobile|ios|android|flutter|react-native|expo/i],
  ['automation', /workflow|orchestration|installer|tooling|cli|ops/i],
];

const ROLE_PATTERNS = [
  ['reviewer', /reviewer|audit/i],
  ['architect', /architect/i],
  ['planner', /planner|planning/i],
  ['engineer', /engineer/i],
  ['developer', /developer/i],
  ['designer', /designer/i],
  ['manager', /manager|lead/i],
  ['writer', /writer|documenter|marketer/i],
  ['analyst', /analyst/i],
  ['researcher', /researcher/i],
  ['tester', /tester|qa|test automator/i],
  ['operator', /operator|installer|orchestrator|coordinator/i],
  ['specialist', /specialist/i],
  ['expert', /expert|pro\b/i],
];

const DESCRIPTION = 'Trait templates generated from the canonical trait catalog and ready for Hero draft initialization.';

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function toSearchText(item) {
  return [
    item.name,
    item.summary,
    item.type,
    ...(item.tags ?? []),
    item.variants?.[item.defaultLanguage]?.bodyPlainText ?? '',
  ].join(' ');
}

function resolveTagGroups(item) {
  const searchText = toSearchText(item);
  const languages = unique(LANGUAGE_PATTERNS.filter(([, pattern]) => pattern.test(searchText)).map(([value]) => value));
  const domains = unique(DOMAIN_PATTERNS.filter(([, pattern]) => pattern.test(searchText)).map(([value]) => value));
  const roles = unique(ROLE_PATTERNS.filter(([, pattern]) => pattern.test(`${item.name} ${item.summary} ${item.type}`)).map(([value]) => value));

  return {
    languages,
    domains,
    roles,
  };
}

function buildTags(item, tagGroups) {
  return unique(
    [
      ...(Array.isArray(item.tags) ? item.tags.map((tag) => normalizeText(tag).toLowerCase()) : []),
      ...tagGroups.languages,
      ...tagGroups.domains,
      ...tagGroups.roles,
      'trait',
    ].map((tag) => tag.replace(/\s+/g, '-')),
  );
}

function resolvePrompt(item) {
  const defaultVariant = item.variants?.[item.defaultLanguage] ?? Object.values(item.variants ?? {})[0];
  return normalizeText(defaultVariant?.bodyPlainText) || normalizeText(defaultVariant?.body) || normalizeText(item.summary);
}

function buildSummary(detail) {
  return {
    id: detail.id,
    templateType: detail.templateType,
    name: detail.name,
    summary: detail.summary,
    path: detail.path,
    tags: detail.tags,
    tagGroups: detail.tagGroups,
    previewText: detail.previewText,
  };
}

export async function buildTraitTemplateSnapshot({
  sourcePath = sourceCatalogPath,
  generatedAt = new Date().toISOString(),
} = {}) {
  const raw = await fs.readFile(sourcePath, 'utf8');
  const catalog = JSON.parse(raw);
  const items = Array.isArray(catalog.items) ? catalog.items : [];

  const details = items
    .map((item) => {
      const prompt = resolvePrompt(item);
      const tagGroups = resolveTagGroups(item);
      const id = normalizeText(item.traitCatalogId) || normalizeText(item.agentId);
      const detail = {
        id,
        templateType: 'trait',
        name: normalizeText(item.name),
        summary: normalizeText(item.summary),
        prompt,
        previewText: prompt,
        tags: buildTags(item, tagGroups),
        tagGroups,
        path: `/agent-templates/trait/templates/${id}.json`,
        sourceRepo: 'repos/trait',
        sourceAgentId: normalizeText(item.sourceAgentId),
        sourceUrl: normalizeText(item.sourceUrl),
      };

      return detail;
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  const summaries = details.map(buildSummary);
  const availableTagGroups = {
    languages: unique(summaries.flatMap((item) => item.tagGroups.languages)),
    domains: unique(summaries.flatMap((item) => item.tagGroups.domains)),
    roles: unique(summaries.flatMap((item) => item.tagGroups.roles)),
  };

  const index = {
    version: '1.0.0',
    generatedAt,
    templateType: 'trait',
    title: 'Trait Templates',
    description: DESCRIPTION,
    availableTagGroups,
    templates: summaries,
  };

  return {
    index,
    details,
  };
}

export async function writeTraitTemplateSnapshot({
  outputDirectory = outputRoot,
  sourcePath = sourceCatalogPath,
  generatedAt,
} = {}) {
  const snapshot = await buildTraitTemplateSnapshot({ sourcePath, generatedAt });
  const nextOutputRoot = outputDirectory;
  const nextIndexPath = path.join(nextOutputRoot, 'index.json');
  const nextTemplatesDir = path.join(nextOutputRoot, 'templates');

  await fs.rm(nextTemplatesDir, { recursive: true, force: true });
  await fs.mkdir(nextTemplatesDir, { recursive: true });
  await fs.writeFile(nextIndexPath, `${JSON.stringify(snapshot.index, null, 2)}\n`, 'utf8');

  await Promise.all(snapshot.details.map((detail) => {
    const detailPath = path.join(nextTemplatesDir, `${detail.id}.json`);
    return fs.writeFile(detailPath, `${JSON.stringify(detail, null, 2)}\n`, 'utf8');
  }));

  return {
    ...snapshot,
    outputDirectory: nextOutputRoot,
  };
}

async function main() {
  const snapshot = await writeTraitTemplateSnapshot();
  process.stdout.write(`Generated ${snapshot.details.length} trait templates at ${path.relative(repoRoot, typeIndexPath)}\n`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
