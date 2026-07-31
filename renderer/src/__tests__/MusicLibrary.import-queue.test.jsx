// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import MusicLibrary from '../MusicLibrary.jsx';

// Minimal window.api mock (renderer tests normally get this from setup.js).
const noop = () => () => {};
if (!globalThis.window) globalThis.window = globalThis;
// happy-dom should provide these, but stub defensively so the component mounts.
if (!window.localStorage) {
  const store = new Map();
  window.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
}
window.api = {
  getTracks: vi.fn().mockResolvedValue([]),
  listLibraries: vi
    .fn()
    .mockResolvedValue([
      {
        id: 1,
        name: 'Default',
        storage_format: 'hashed',
        root_path: null,
        effective_root_path: '/tmp/audio',
      },
    ]),
  onTrackUpdated: vi.fn().mockImplementation(noop),
  onCuePointsUpdated: vi.fn().mockImplementation(noop),
  onLibraryUpdated: vi.fn().mockImplementation(noop),
  onPlaylistsUpdated: vi.fn().mockImplementation(noop),
  getPlaylist: vi.fn().mockResolvedValue(null),
  getMediaPort: vi.fn().mockResolvedValue(19876),
};

// Render all rows inline — no virtualization in tests
vi.mock('react-window', () => ({
  List: ({ rowComponent, rowProps, rowCount }) => {
    const Item = rowComponent;
    return (
      <div data-testid="virtual-list">
        {Array.from({ length: rowCount }, (_, i) => (
          <Item key={i} index={i} style={{}} {...rowProps} />
        ))}
      </div>
    );
  },
}));

// Capture updateQueue so we can assert it is called on import, and (critically)
// that it is NOT called from inside a setState updater (which throws
// "Cannot update a component (PlayerProvider) while rendering a different
// component (MusicLibrary)").
const updateQueue = vi.fn();
vi.mock('../PlayerContext.jsx', () => ({
  usePlayer: () => ({
    play: vi.fn(),
    currentTrack: null,
    currentPlaylistId: null,
    updateQueue,
    unavailableLinkedIds: new Set(),
  }),
}));

vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }) => children,
  closestCenter: vi.fn(),
  PointerSensor: class {},
  useSensor: vi.fn(() => null),
  useSensors: vi.fn((...args) => args),
  DragOverlay: () => null,
}));

vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }) => children,
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
  verticalListSortingStrategy: vi.fn(),
  arrayMove: (arr, from, to) => {
    const res = [...arr];
    res.splice(to, 0, res.splice(from, 1)[0]);
    return res;
  },
}));

vi.mock('@dnd-kit/utilities', () => ({
  CSS: { Transform: { toString: () => '' } },
}));

describe('MusicLibrary import → player queue sync (#import-crash)', () => {
  beforeEach(() => {
    updateQueue.mockClear();
    vi.clearAllMocks();
    // Default: empty library
    window.api.getTracks = vi.fn().mockResolvedValue([]);
  });

  it('syncs the player queue on import without setState-during-render', async () => {
    // Capture the onLibraryUpdated subscription callback.
    let libraryUpdatedCb = null;
    window.api.onLibraryUpdated = vi.fn((cb) => {
      libraryUpdatedCb = cb;
      return () => {};
    });

    render(<MusicLibrary selectedPlaylist="music" search="" onSearchChange={() => {}} />);

    expect(libraryUpdatedCb).toBeTypeOf('function');

    // Simulate an import: the next getTracks returns one brand-new track.
    const newTrack = {
      id: 999,
      title: 'Imported Track',
      artist: 'Tester',
      duration: 180,
      is_linked: false,
      bpm: null,
    };
    window.api.getTracks = vi.fn().mockResolvedValue([newTrack]);

    // Fire the import event (this is what happens after a track is imported).
    libraryUpdatedCb();

    // The queue must be synced with the imported track, and it must not throw
    // "Cannot update a component (PlayerProvider) while rendering a different
    // component (MusicLibrary)".
    await waitFor(() => {
      expect(updateQueue).toHaveBeenCalledTimes(1);
    });

    const queued = updateQueue.mock.calls[0][0];
    expect(Array.isArray(queued)).toBe(true);
    expect(queued.some((t) => t.id === 999)).toBe(true);
  });
});
