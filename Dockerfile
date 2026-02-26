# DJ Manager — development container
# Supports: npm run dev (with X11), npm test, npm run lint, npm run build
FROM node:22-bookworm

# ── System dependencies ────────────────────────────────────────────────────────
# Electron runtime + native module build tools + Python + audio + display
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Build tools (native modules like better-sqlite3)
    python3 python3-pip python3-venv build-essential \
    # Electron runtime dependencies
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 \
    libxrandr2 libgbm1 libasound2 libpangocairo-1.0-0 libpango-1.0-0 \
    libcairo2 libgtk-3-0 libgdk-pixbuf2.0-0 libx11-xcb1 libxcb-dri3-0 \
    # Audio (PulseAudio client for Electron audio output)
    pulseaudio-utils libpulse0 \
    # X11 / virtual display (for running Electron in CI or headless mode)
    xvfb x11-utils \
    # Utilities
    git curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# ── Python: install mixxx-analyzer ────────────────────────────────────────────
COPY python/requirements.txt /tmp/py-requirements.txt
RUN pip3 install --break-system-packages -r /tmp/py-requirements.txt

# ── Node: set up workspace ─────────────────────────────────────────────────────
WORKDIR /workspace

# Install root deps (ignore Electron postinstall — no Electron binary in container)
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts --legacy-peer-deps

# Rebuild native modules for the container's Node (not Electron)
RUN npm rebuild better-sqlite3

# Install renderer deps
COPY renderer/package.json renderer/package-lock.json ./renderer/
RUN cd renderer && npm ci --legacy-peer-deps

# Copy source (done last so layer cache survives source-only changes)
COPY . .

# ── Electron rebuild for the container ────────────────────────────────────────
# Rebuild better-sqlite3 against Electron's Node ABI so `npm run dev` works
RUN npx @electron/rebuild -f -w better-sqlite3 || true

# ── Default command ────────────────────────────────────────────────────────────
# Override in docker-compose or with `docker run … <cmd>`
CMD ["bash"]
