# Trait hagi18n workflow

Trait UI translations are maintained as YAML source files under `src/i18n/locales-source/` and generated into TypeScript runtime modules under `src/i18n/locales/`.

## Install and verify hagi18n

Install repository dependencies so the local `hagi18n` binary is available:

```bash
pnpm install
```

Verify the CLI before using the Trait workflow:

```bash
hagi18n info
```

Trait scripts resolve the repository-local `hagi18n` binary from `devDependencies`. Use the `pnpm run i18n:*` commands from this repository instead of relying on a global installation.

## Source and runtime contract

- YAML files in `src/i18n/locales-source/<locale>/ui.yml` are the source of truth.
- Generated TypeScript files in `src/i18n/locales/` are runtime artifacts consumed by `src/i18n/use-locale.ts` and component tests.
- `en-US` is the hagi18n base locale, but the existing Trait runtime keeps the English UI locale id as `en`.
- The generator maps `src/i18n/locales-source/en-US/ui.yml` to `src/i18n/locales/en.ts`.
- The generated files are committed because Trait does not ignore locale runtime artifacts and Astro/Vitest imports them directly.
- Do not hand-edit `src/i18n/locales/*.ts`; regenerate them from YAML.

Trait now exposes the full Desktop-aligned locale set in the user-facing switcher: `en`, `zh-CN`, `zh-Hant`, `ja-JP`, `ko-KR`, `de-DE`, `fr-FR`, `es-ES`, `pt-BR`, and `ru-RU`.

## Project-local commands

Run these from `repos/trait`:

```bash
pnpm run i18n:audit
pnpm run i18n:report
pnpm run i18n:doctor
pnpm run i18n:sync
pnpm run i18n:sync:write
pnpm run i18n:prune
pnpm run i18n:prune:write
pnpm run i18n:generate
pnpm run i18n:check
```

`pnpm run i18n:check` runs hagi18n audit, hagi18n doctor, generation, stale-output verification, and targeted i18n tests.

## Dry-run-first sync and prune workflow

`sync` and `prune` are preview-only by default.

1. Review drift with `pnpm run i18n:audit` and `pnpm run i18n:doctor`.
2. Preview missing keys with `pnpm run i18n:sync`.
3. Preview obsolete keys with `pnpm run i18n:prune`.
4. Apply reviewed additions with `pnpm run i18n:sync:write`.
5. Apply reviewed removals with `pnpm run i18n:prune:write`.
6. Regenerate runtime modules with `pnpm run i18n:generate`.
7. Finish with `pnpm run i18n:check`.

## Adding or updating a translation key

1. Edit `src/i18n/locales-source/en-US/ui.yml` first.
2. Add the same key path to every target locale file under `src/i18n/locales-source/<locale>/ui.yml`.
3. Preserve interpolation placeholders exactly, including names such as `{{count}}`, `{{language}}`, and `{{year}}`.
4. Run `pnpm run i18n:audit`.
5. Run `pnpm run i18n:generate`.
6. Run `pnpm run i18n:check` before committing.

## Doctor allowlist notes

Trait intentionally retains the runtime English UI locale id `en` for existing routes, catalog state, and browser storage compatibility. The doctor allowlist in `hagi18n.yaml` covers reviewed source and test files that still contain this intentional `en` literal. Do not add new allowlist entries unless they are preserving the same compatibility contract.
