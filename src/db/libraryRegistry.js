import path from 'path';
import fs from 'fs';
import crypto from 'crypto';

// Registry lives in userData as a small JSON file — deliberately OUTSIDE any
// per-library database, since we need to know which DB file to open before
// any database connection exists. Each library is otherwise just a name plus
// a DB filename; the library's root folder and storage format are ordinary
// settings *inside* that library's own database (settingsRepository.js), so
// switching libraries automatically switches those too — no separate sync
// needed between the registry and per-library settings.

async function userDataDir() {
  if (process.env.USER_DATA_DIR) return process.env.USER_DATA_DIR;
  try {
    const { app } = await import('electron');
    return app.getPath('userData');
  } catch {
    return process.cwd();
  }
}

function defaultRegistry() {
  // Preserve existing installs: the first library points at the pre-existing
  // library.db filename so upgrading doesn't orphan anyone's data.
  return {
    libraries: [{ id: 'default', name: 'Default', dbFile: 'library.db' }],
    activeId: 'default',
  };
}

let cachedDir = null;
let cachedRegistry = null;

async function registryPath() {
  if (!cachedDir) cachedDir = await userDataDir();
  return path.join(cachedDir, 'libraries.json');
}

function readRegistryFile(p) {
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null; // corrupt file — treat as absent rather than crashing the app
  }
}

function writeRegistryFile(p, registry) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(registry, null, 2));
}

export async function loadRegistry() {
  if (cachedRegistry) return cachedRegistry;
  const p = await registryPath();
  cachedRegistry = readRegistryFile(p) ?? defaultRegistry();
  writeRegistryFile(p, cachedRegistry);
  return cachedRegistry;
}

async function saveRegistry(registry) {
  cachedRegistry = registry;
  writeRegistryFile(await registryPath(), registry);
}

/** Test-only: drop the in-memory cache so the next call re-reads from disk. */
export function _resetRegistryCache() {
  cachedDir = null;
  cachedRegistry = null;
}

export async function listLibraries() {
  return (await loadRegistry()).libraries;
}

export async function getActiveLibrary() {
  // Vitest sets this for every test run, regardless of which project/config
  // is active — short-circuit before any real disk I/O so importManager.js's
  // (and database.js's) top-level lookup never touches a real userData path
  // during tests, even ones that don't set DB_PATH/USER_DATA_DIR themselves.
  if (process.env.VITEST && !process.env.USER_DATA_DIR) {
    return defaultRegistry().libraries[0];
  }
  const registry = await loadRegistry();
  return (
    registry.libraries.find((l) => l.id === registry.activeId) ?? registry.libraries[0] ?? null
  );
}

export async function createLibrary(name) {
  const registry = await loadRegistry();
  const id = crypto.randomUUID();
  const entry = { id, name: name?.trim() || 'New Library', dbFile: `library-${id}.db` };
  registry.libraries.push(entry);
  await saveRegistry(registry);
  return entry;
}

export async function renameLibrary(id, name) {
  const registry = await loadRegistry();
  const entry = registry.libraries.find((l) => l.id === id);
  if (!entry) throw new Error('Library not found.');
  entry.name = name?.trim() || entry.name;
  await saveRegistry(registry);
  return entry;
}

export async function setActiveLibrary(id) {
  const registry = await loadRegistry();
  if (!registry.libraries.some((l) => l.id === id)) throw new Error('Library not found.');
  registry.activeId = id;
  await saveRegistry(registry);
}
