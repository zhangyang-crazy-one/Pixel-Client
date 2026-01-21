# Repository Guidelines

## Project Structure & Module Organization
- `App.tsx` and `index.tsx` are the main React entrypoints for the desktop shell.
- `components/` and `services/` hold core UI and frontend service logic used by the entrypoints.
- `src/` contains shared modules (`components/`, `hooks/`, `services/`, `types/`) and styles in `src/index.css`.
- `src-tauri/` contains the Rust backend, Tauri config (`src-tauri/tauri.conf.json`), and native build assets.
- `public/` and `assets/` store static assets, icons, and images; build output lands in `dist/`.
- Tests live in `__tests__/` and `src/__tests__/`.

## Build, Test, and Development Commands
- `bun run dev`: run the Tauri desktop app with the Vite dev server.
- `bun run dev:vite`: run the Vite web dev server only.
- `bun run build`: build the frontend bundle into `dist/`.
- `bun run preview`: preview the built frontend.
- `bun run test`: run Vitest once.
- `bun run test:watch`: run Vitest in watch mode.
- `bun run tauri build`: build native installers.

## Coding Style & Naming Conventions
- TypeScript + React with functional components; keep components in PascalCase (e.g., `ModelManager.tsx`).
- Hooks should be named `useThing` and live under `src/hooks/`.
- Indent with 2 spaces to match existing TS/TSX files.
- Tailwind CSS is configured in `tailwind.config.js`; keep class ordering consistent within a block.

## Testing Guidelines
- Framework: Vitest with Testing Library.
- Place tests as `*.test.ts` or `*.test.tsx` under `__tests__/` or `src/__tests__/`.
- No explicit coverage threshold found; add targeted tests for new logic and UI flows.

## Commit & Pull Request Guidelines
- Commit messages follow a Conventional Commits style (`feat:`, `fix:`); keep subjects short and imperative.
- PRs should include a short summary, testing notes (commands run), and screenshots for UI changes.
- Call out platform coverage (Windows/macOS/Linux) when touching Tauri or windowing code.

## Configuration & Secrets
- Copy `.env.example` to `.env.local` for local keys; do not commit secrets.
- For Tauri signing, follow the release notes in `README.md` and keep private keys out of the repo.
