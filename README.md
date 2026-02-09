## Hyacinth Medication Dispensing & Inventory System

Hyacinth is a desktop application for **medication dispensing, inventory tracking, and clinical workflows**, built on top of Electron and React.

This repository contains the **sample implementation** used for:

- **Quick Dispense mode** for common treatment templates
- **Backup & restore UI** for local data
- **Enhanced search** across dispensing history

The codebase is derived from `electron-react-boilerplate` but is now focused on the **Hyacinth** domain.

---

### Tech Stack

- **Electron** – cross‑platform desktop shell
- **React + TypeScript** – renderer UI
- **Tailwind CSS v4** – utility-first styling with PostCSS
- **Webpack** – bundling and dev tooling
- **Jest + React Testing Library** – unit tests
- **Playwright** – end‑to‑end tests (`e2e/` directory)

---

### Getting Started

- **Prerequisites**
  - Node.js `>= 14.x`
  - npm `>= 7.x`
  - macOS, Windows, or Linux desktop

Install dependencies:

```bash
npm install
```

Start the app in development:

```bash
npm start
```

Run unit tests:

```bash
npm test
```

Run end‑to‑end tests:

```bash
npm run test:e2e
```

Package a production build for your local platform:

```bash
npm run package
```

---

### Project Structure (High Level)

- `src/main` – Electron main process, IPC handlers, app lifecycle
- `src/renderer` – React UI (dispensing log, quick dispense, settings, etc.)
  - `tailwind.css` – Tailwind CSS entry point (imported first in `index.tsx`)
  - `App.scss` – custom styles and accessibility overrides
- `src/shared` – shared types and IPC channel definitions
- `e2e/` – Playwright tests for login, dispensing, inventory
- `docs/` – regulatory and security documentation
  - `HIPAA_README.md`, `HIPAA_COMPLIANCE.md`
  - `SECURITY_PROCEDURES.md`, `PRIVACY_NOTICE.md`
- `IMPLEMENTATION_SUMMARY.md` – overview of completed Hyacinth features
- `QUICK_DISPENSE_IMPLEMENTATION.md` – detailed quick‑dispense integration notes

See those documents for deeper implementation details.

**Note on CSS**: Tailwind CSS is imported directly in `src/renderer/index.tsx` before `App.scss` to ensure proper CSS cascade. The PostCSS configuration (`postcss.config.js`) processes Tailwind directives using `@tailwindcss/postcss` plugin.

---

### Engineering & Operations Notes

- **Simplicity first**: favor clear, linear control flow over heavy abstraction.
- **Data integrity**: persistence rules live in the data layer and IPC handlers, not scattered across components.
- **Debuggability**: IPC handlers and key operations log structured information and return explicit success/error results.
- **Testing**: Playwright flows in `e2e/` cover the main clinical paths (login, dispensing, inventory).

When adding new features, keep to this style: _small, explicit modules with loud failures and clear docs_.

---

### License

This repository is licensed under the **MIT License**. See `LICENSE` for details.

