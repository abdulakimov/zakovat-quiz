# AGENTS.md
When you finish any task that changes files:
1) Run tests (or pnpm test if available).
2) Show a short summary of changes.
3) Stage all changes: git add -A
4) Create a commit with a clear message (conventional style).
5) If tests fail, do not commit; fix first.

## i18n / UI Copy Rules (MUST FOLLOW)

### Supported locales
- Locales: `uz` (default), `ru`, `en`
- Routing: locale-prefixed URLs (`/uz`, `/ru`, `/en`)
- If user visits a non-prefixed URL, redirect to `/uz/...`

### No hardcoded UI text
- **No user-visible hardcoded strings** in JSX/TSX (including buttons, tabs, headings, labels, empty states, toasts, dialogs).
- All UI copy must be sourced via `t("...")` using next-intl:
    - Client components: `useTranslations()` (or project wrapper `useT()`)
    - Server components: `getTranslations()` (or wrapper `getT()`)

### Translation coverage is required
- Any new `t("...")` key MUST be added to:
    - `messages/uz.json`
    - `messages/ru.json`
    - `messages/en.json`
- Uzbek is the default and must be fully filled (no English fallback in production).

### Plurals & interpolation
- Any numeric copy must use ICU/plural rules:
    - Examples: `t("rounds.total", {count})`, `t("questions.count", {count})`
- Avoid manual string concatenation for translated strings.

### Enums / badges / status labels
- Do not hardcode labels for enums (e.g. round types, statuses).
- Use mapping functions that return translated labels:
    - `t("roundType.image")`, `t("status.draft")`, etc.

### Testability
- Add `data-testid` to any interactive UI that tests will touch:
    - language switcher, tabs, primary buttons, key badges.
- Keep selectors stable (no text-only selectors in tests).

### Playwright E2E (required for UI changes)
When adding or changing UI:
- Update/add Playwright tests to verify:
    1) default locale redirect to `/uz`
    2) language switching changes visible copy
    3) locale persists across navigation
    4) no console errors
- Run: `npm run test:e2e` (or equivalent) and ensure passing.

### CI / Lint gates (if present)
- Lint/build/tests must pass.
- If i18n key checker exists, add keys for all locales.