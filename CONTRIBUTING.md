# Contributing to DJ Manager

Thanks for wanting to help! This guide gets you from zero to running code as fast as possible.

---

## Option A — Docker (recommended, no local installs needed)

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/install/)
- An X server if you want to run the Electron GUI:
  - **Linux** — already have one; run `xhost +local:docker` once before starting
  - **macOS** — install [XQuartz](https://www.xquartz.org/), tick _Allow connections from network clients_, then `export DISPLAY=host.docker.internal:0`
  - **Windows** — install [VcXsrv](https://sourceforge.net/projects/vcxsrv/) or use WSL2 with WSLg

### Build the image (first time, ~3 min)

```bash
docker compose build
```

### Run the app

```bash
docker compose up app
```

### Run tests

```bash
docker compose run --rm test
```

### Lint

```bash
docker compose run --rm lint
```

---

## Option B — VS Code Dev Container

1. Install the [Dev Containers](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers) extension
2. Open this repo in VS Code
3. Press **F1** → `Dev Containers: Reopen in Container`

ESLint, Prettier, and Vitest runner are pre-configured inside the container.

---

## Option C — Local setup

### Requirements

| Tool    | Version    |
| ------- | ---------- |
| Node.js | 22.x       |
| Python  | 3.11+      |
| Git     | any recent |

### Steps

```bash
# 1. Install JS dependencies
npm install --legacy-peer-deps
cd renderer && npm install --legacy-peer-deps && cd ..

# 2. Install Python analyzer
pip install -r python/requirements.txt

# 3. Rebuild native module for Electron
npx @electron/rebuild -f -w better-sqlite3

# 4. Start the app
npm run dev
```

---

## Project layout

```
dj_manager/
├── src/               # Electron main process (Node.js)
│   ├── db/            # SQLite repositories (trackRepository, playlistRepository, …)
│   ├── audio/         # Analysis worker, ffmpeg wrapper, key utils
│   ├── main.js        # App entry + IPC handlers
│   └── preload.js     # Context bridge (main ↔ renderer)
├── renderer/          # React frontend (Vite)
│   └── src/
│       ├── PlayerContext.jsx   # Global audio state
│       ├── MusicLibrary.jsx    # Track table + search
│       ├── Sidebar.jsx         # Playlists panel
│       └── PlayerBar.jsx       # Transport controls + seekbar
├── python/            # mixxx-analyzer wrapper script
├── scripts/           # CI/release helper scripts
└── .github/workflows/ # CI (lint + tests + coverage) and release
```

---

## Development workflow

```bash
npm run dev          # start app (hot-reload on renderer changes)
npm test             # run main-process tests (vitest)
cd renderer && npm test   # run renderer tests
npm run lint:all     # ESLint across main + renderer
npm run format       # Prettier (auto-fix)
npm run format:check # Prettier (CI check)
```

### Pre-commit hook

Husky runs lint-staged automatically on `git commit` — it will ESLint-fix and Prettier-format your staged files. No manual step needed.

### Coverage

```bash
npm run test:coverage            # main process (src/db/**)
cd renderer && npm run test:coverage  # renderer (src/**)
```

HTML reports are written to `./coverage/`. Minimum thresholds are enforced:

| Scope             | Statements | Branches | Functions |
| ----------------- | ---------- | -------- | --------- |
| `src/db/**`       | 75%        | 70%      | 75%       |
| `renderer/src/**` | 10%        | 60%      | 15%       |

---

## Adding a feature

1. Create a branch from `master`: `git checkout -b feat/your-feature`
2. Make your changes
3. Add/update tests if touching `src/db/` or a React component
4. Run `npm run lint:all && npm test` to make sure everything is green
5. Commit — the pre-commit hook formats code automatically
6. Open a PR against `master`

---

## Commit style

We loosely follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix      | When to use                       |
| ----------- | --------------------------------- |
| `feat:`     | New feature                       |
| `fix:`      | Bug fix                           |
| `chore:`    | Maintenance (deps, config)        |
| `test:`     | Test-only changes                 |
| `docs:`     | Documentation only                |
| `refactor:` | Refactor without behaviour change |

---

## Questions?

Open an [issue](https://github.com/Radexito/djman/issues) — happy to help.
