/**
 * Unit tests for playlistRepository.js
 * Tests database operations for playlist management
 */

import { jest } from '@jest/globals';
import {
  getAllPlaylists,
  createPlaylist,
  getPlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  getPlaylistTracks,
  updateTrackOrder,
  removeTrackFromPlaylist
} from '../../src/db/playlistRepository.js';

// Mock the database module
jest.mock('../../src/db/database.js', () => {
  const mockPrepare = jest.fn();
  
  return {
    default: {
      prepare: mockPrepare,
    },
    __mockPrepare: mockPrepare,
  };
});

describe('Playlist Repository', () => {
  let mockPrepare;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const dbModule = await import('../../src/db/database.js');
    mockPrepare = dbModule.__mockPrepare;
  });

  describe('getAllPlaylists', () => {
    
    test('should retrieve all playlists ordered by name', () => {
      const mockPlaylists = [
        { id: 1, name: 'Favorites' },
        { id: 2, name: 'Workout' },
        { id: 3, name: 'Chill' }
      ];
      
      const mockStmt = {
        all: jest.fn().mockReturnValue(mockPlaylists)
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      const result = getAllPlaylists();
      
      expect(result).toEqual(mockPlaylists);
      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM playlists ORDER BY name');
    });

    test('should return empty array when no playlists exist', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([])
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      const result = getAllPlaylists();
      
      expect(result).toEqual([]);
    });

    test('should order playlists alphabetically', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([])
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      getAllPlaylists();
      
      const sql = mockPrepare.mock.calls[0][0];
      expect(sql).toContain('ORDER BY name');
    });
  });

  describe('createPlaylist', () => {
    
    test('should insert a new playlist and return ID', () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ lastInsertRowid: 42 })
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      const id = createPlaylist('My Playlist');
      
      expect(id).toBe(42);
      expect(mockPrepare).toHaveBeenCalledWith('INSERT INTO playlists (name) VALUES (?)');
      expect(mockStmt.run).toHaveBeenCalledWith('My Playlist');
    });

    test('should handle playlist names with special characters', () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ lastInsertRowid: 1 })
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      const id = createPlaylist("Rock & Roll's Best");
      
      expect(id).toBe(1);
      expect(mockStmt.run).toHaveBeenCalledWith("Rock & Roll's Best");
    });

    test('should handle empty playlist name', () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ lastInsertRowid: 5 })
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      const id = createPlaylist('');
      
      expect(id).toBe(5);
      expect(mockStmt.run).toHaveBeenCalledWith('');
    });

    test('should use SQL INSERT statement', () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ lastInsertRowid: 1 })
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      createPlaylist('Test');
      
      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO playlists')
      );
    });
  });

  describe('getPlaylist', () => {
    
    test('should retrieve a playlist by ID', () => {
      const mockPlaylist = { id: 10, name: 'My Playlist' };
      
      const mockStmt = {
        get: jest.fn().mockReturnValue(mockPlaylist)
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      const result = getPlaylist(10);
      
      expect(result).toEqual(mockPlaylist);
      expect(mockPrepare).toHaveBeenCalledWith('SELECT * FROM playlists WHERE id = ?');
      expect(mockStmt.get).toHaveBeenCalledWith(10);
    });

    test('should return undefined for non-existent playlist', () => {
      const mockStmt = {
        get: jest.fn().mockReturnValue(undefined)
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      const result = getPlaylist(999);
      
      expect(result).toBeUndefined();
    });

    test('should accept numeric ID', () => {
      const mockStmt = {
        get: jest.fn().mockReturnValue({ id: 1, name: 'Test' })
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      getPlaylist(42);
      
      expect(mockStmt.get).toHaveBeenCalledWith(42);
    });
  });

  describe('deletePlaylist', () => {
    
    test('should delete a playlist by ID', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      deletePlaylist(15);
      
      expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM playlists WHERE id = ?');
      expect(mockStmt.run).toHaveBeenCalledWith(15);
    });

    test('should handle deletion of non-existent playlist', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      // Should not throw error
      expect(() => deletePlaylist(9999)).not.toThrow();
    });

    test('should use DELETE SQL statement', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      deletePlaylist(1);
      
      expect(mockPrepare).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM playlists')
      );
    });

    test('should only delete specified playlist', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      deletePlaylist(5);
      
      const sql = mockPrepare.mock.calls[0][0];
      expect(sql).toContain('WHERE id = ?');
      expect(mockStmt.run).toHaveBeenCalledWith(5);
    });
  });

  describe('addTrackToPlaylist', () => {
    
    test('should add track to playlist with order', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      addTrackToPlaylist(10, 20, 1);
      
      expect(mockPrepare).toHaveBeenCalled();
      expect(mockStmt.run).toHaveBeenCalledWith(10, 20, 1);
    });

    test('should use INSERT statement with playlist_tracks table', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      addTrackToPlaylist(1, 2, 0);
      
      const sql = mockPrepare.mock.calls[0][0];
      expect(sql).toContain('INSERT INTO playlist_tracks');
      expect(sql).toContain('playlist_id');
      expect(sql).toContain('track_id');
      expect(sql).toContain('track_order');
    });

    test('should support different track orders', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      addTrackToPlaylist(1, 100, 5);
      addTrackToPlaylist(1, 101, 10);
      
      expect(mockStmt.run).toHaveBeenCalledWith(1, 100, 5);
      expect(mockStmt.run).toHaveBeenCalledWith(1, 101, 10);
    });

    test('should handle zero-based ordering', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      addTrackToPlaylist(1, 1, 0);
      
      expect(mockStmt.run).toHaveBeenCalledWith(1, 1, 0);
    });
  });

  describe('getPlaylistTracks', () => {
    
    test('should retrieve tracks in a playlist ordered by track_order', () => {
      const mockTracks = [
        { id: 1, title: 'Track 1', track_order: 0 },
        { id: 2, title: 'Track 2', track_order: 1 },
        { id: 3, title: 'Track 3', track_order: 2 }
      ];
      
      const mockStmt = {
        all: jest.fn().mockReturnValue(mockTracks)
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      const result = getPlaylistTracks(10);
      
      expect(result).toEqual(mockTracks);
      expect(mockStmt.all).toHaveBeenCalledWith(10);
    });

    test('should use JOIN to get track details', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([])
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      getPlaylistTracks(5);
      
      const sql = mockPrepare.mock.calls[0][0];
      expect(sql).toContain('JOIN tracks');
      expect(sql).toContain('playlist_tracks pt');
    });

    test('should order by track_order ASC', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([])
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      getPlaylistTracks(1);
      
      const sql = mockPrepare.mock.calls[0][0];
      expect(sql).toContain('ORDER BY pt.track_order ASC');
    });

    test('should filter by playlist_id', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([])
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      getPlaylistTracks(42);
      
      const sql = mockPrepare.mock.calls[0][0];
      expect(sql).toContain('WHERE pt.playlist_id = ?');
      expect(mockStmt.all).toHaveBeenCalledWith(42);
    });

    test('should return empty array for playlist with no tracks', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([])
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      const result = getPlaylistTracks(99);
      
      expect(result).toEqual([]);
    });
  });

  describe('updateTrackOrder', () => {
    
    test('should update track order in playlist', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      updateTrackOrder(10, 20, 5);
      
      expect(mockPrepare).toHaveBeenCalled();
      expect(mockStmt.run).toHaveBeenCalledWith(5, 10, 20);
    });

    test('should use UPDATE statement', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      updateTrackOrder(1, 2, 3);
      
      const sql = mockPrepare.mock.calls[0][0];
      expect(sql).toContain('UPDATE playlist_tracks');
      expect(sql).toContain('SET track_order = ?');
    });

    test('should filter by both playlist_id and track_id', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      updateTrackOrder(1, 2, 3);
      
      const sql = mockPrepare.mock.calls[0][0];
      expect(sql).toContain('WHERE playlist_id = ? AND track_id = ?');
    });

    test('should accept new order as first parameter to run', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      updateTrackOrder(10, 20, 15);
      
      // Parameters: newOrder, playlistId, trackId
      expect(mockStmt.run).toHaveBeenCalledWith(15, 10, 20);
    });

    test('should support reordering to position 0', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      updateTrackOrder(1, 5, 0);
      
      expect(mockStmt.run).toHaveBeenCalledWith(0, 1, 5);
    });
  });

  describe('removeTrackFromPlaylist', () => {
    
    test('should remove track from playlist', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      removeTrackFromPlaylist(10, 20);
      
      expect(mockPrepare).toHaveBeenCalled();
      expect(mockStmt.run).toHaveBeenCalledWith(10, 20);
    });

    test('should use DELETE statement', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      removeTrackFromPlaylist(1, 2);
      
      const sql = mockPrepare.mock.calls[0][0];
      expect(sql).toContain('DELETE FROM playlist_tracks');
    });

    test('should filter by both playlist_id and track_id', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      removeTrackFromPlaylist(5, 10);
      
      const sql = mockPrepare.mock.calls[0][0];
      expect(sql).toContain('WHERE playlist_id = ? AND track_id = ?');
      expect(mockStmt.run).toHaveBeenCalledWith(5, 10);
    });

    test('should handle removal of non-existent track', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      // Should not throw error
      expect(() => removeTrackFromPlaylist(999, 999)).not.toThrow();
    });
  });

  describe('Integration Scenarios', () => {
    
    test('should support full playlist workflow', () => {
      const mockCreateStmt = {
        run: jest.fn().mockReturnValue({ lastInsertRowid: 1 })
      };
      const mockAddStmt = {
        run: jest.fn()
      };
      const mockGetStmt = {
        all: jest.fn().mockReturnValue([
          { id: 100, title: 'Track 1', track_order: 0 },
          { id: 101, title: 'Track 2', track_order: 1 }
        ])
      };
      
      mockPrepare.mockReturnValueOnce(mockCreateStmt)  // createPlaylist
        .mockReturnValueOnce(mockAddStmt)              // addTrackToPlaylist
        .mockReturnValueOnce(mockAddStmt)              // addTrackToPlaylist
        .mockReturnValueOnce(mockGetStmt);             // getPlaylistTracks
      
      // Create playlist
      const playlistId = createPlaylist('Test Playlist');
      expect(playlistId).toBe(1);
      
      // Add tracks
      addTrackToPlaylist(playlistId, 100, 0);
      addTrackToPlaylist(playlistId, 101, 1);
      
      // Get tracks
      const tracks = getPlaylistTracks(playlistId);
      expect(tracks).toHaveLength(2);
    });

    test('should support track reordering', () => {
      const mockUpdateStmt = {
        run: jest.fn()
      };
      
      mockPrepare.mockReturnValue(mockUpdateStmt);
      
      // Move track from position 2 to position 0
      updateTrackOrder(1, 100, 0);
      updateTrackOrder(1, 101, 1);
      updateTrackOrder(1, 102, 2);
      
      expect(mockUpdateStmt.run).toHaveBeenCalledTimes(3);
    });
  });

  describe('Error Handling', () => {
    
    test('should propagate database errors on insert', () => {
      const mockStmt = {
        run: jest.fn().mockImplementation(() => {
          throw new Error('Database error');
        })
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      expect(() => {
        createPlaylist('Test');
      }).toThrow('Database error');
    });

    test('should handle query errors in getPlaylistTracks', () => {
      const mockStmt = {
        all: jest.fn().mockImplementation(() => {
          throw new Error('Query failed');
        })
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      expect(() => {
        getPlaylistTracks(1);
      }).toThrow('Query failed');
    });

    test('should handle constraint violations', () => {
      const mockStmt = {
        run: jest.fn().mockImplementation(() => {
          throw new Error('UNIQUE constraint failed');
        })
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      expect(() => {
        addTrackToPlaylist(1, 1, 0);
      }).toThrow('UNIQUE constraint');
    });
  });
});
