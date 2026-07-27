import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

// These tests exercise the real filesystem via USER_DATA_DIR (mirroring
// database.js's DB_PATH escape hatch) rather than mocking fs — the module's
// whole job is reading/writing a real JSON file, so that's what's worth
// verifying. USER_DATA_DIR also bypasses the VITEST short-circuit in
// getActiveLibrary() that every other test relies on to avoid touching disk.

let tmpDir;

beforeEach(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dj_library_registry_test_'));
  process.env.USER_DATA_DIR = tmpDir;
  const registry = await import('../db/libraryRegistry.js');
  registry._resetRegistryCache();
});

afterEach(() => {
  delete process.env.USER_DATA_DIR;
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('libraryRegistry — first run', () => {
  it('creates a default library pointing at the legacy library.db filename', async () => {
    const { listLibraries, getActiveLibrary } = await import('../db/libraryRegistry.js');

    const libraries = await listLibraries();
    expect(libraries).toEqual([{ id: 'default', name: 'Default', dbFile: 'library.db' }]);

    const active = await getActiveLibrary();
    expect(active.id).toBe('default');
  });

  it('persists the default registry to disk so it survives a restart', async () => {
    const { loadRegistry } = await import('../db/libraryRegistry.js');
    await loadRegistry();

    const onDisk = JSON.parse(fs.readFileSync(path.join(tmpDir, 'libraries.json'), 'utf8'));
    expect(onDisk.activeId).toBe('default');
    expect(onDisk.libraries).toHaveLength(1);
  });
});

describe('libraryRegistry — create/switch/rename', () => {
  it('createLibrary adds a new entry with a unique dbFile and does not change the active library', async () => {
    const { createLibrary, listLibraries, getActiveLibrary } = await import(
      '../db/libraryRegistry.js'
    );

    const created = await createLibrary('Gigs USB');
    expect(created.name).toBe('Gigs USB');
    expect(created.dbFile).toMatch(/^library-.+\.db$/);
    expect(created.dbFile).not.toBe('library.db');

    const libraries = await listLibraries();
    expect(libraries).toHaveLength(2);

    // Still on the original default library until explicitly switched
    expect((await getActiveLibrary()).id).toBe('default');
  });

  it('setActiveLibrary changes which library is active', async () => {
    const { createLibrary, setActiveLibrary, getActiveLibrary } = await import(
      '../db/libraryRegistry.js'
    );

    const created = await createLibrary('Gigs USB');
    await setActiveLibrary(created.id);

    expect((await getActiveLibrary()).id).toBe(created.id);
  });

  it('setActiveLibrary throws for an unknown id', async () => {
    const { setActiveLibrary } = await import('../db/libraryRegistry.js');
    await expect(setActiveLibrary('does-not-exist')).rejects.toThrow('Library not found.');
  });

  it('renameLibrary updates the display name only', async () => {
    const { createLibrary, renameLibrary, listLibraries } = await import(
      '../db/libraryRegistry.js'
    );

    const created = await createLibrary('Gigs USB');
    const renamed = await renameLibrary(created.id, 'Renamed');
    expect(renamed.name).toBe('Renamed');
    expect(renamed.dbFile).toBe(created.dbFile); // unchanged

    const libraries = await listLibraries();
    expect(libraries.find((l) => l.id === created.id).name).toBe('Renamed');
  });

  it('renameLibrary throws for an unknown id', async () => {
    const { renameLibrary } = await import('../db/libraryRegistry.js');
    await expect(renameLibrary('does-not-exist', 'x')).rejects.toThrow('Library not found.');
  });
});

describe('libraryRegistry — corrupt/missing registry file recovery', () => {
  it('falls back to a fresh default registry if the JSON file is corrupt', async () => {
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'libraries.json'), '{ not valid json');

    const { listLibraries } = await import('../db/libraryRegistry.js');
    const libraries = await listLibraries();
    expect(libraries).toEqual([{ id: 'default', name: 'Default', dbFile: 'library.db' }]);
  });
});
