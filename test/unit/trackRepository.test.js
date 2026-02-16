/**
 * Unit tests for trackRepository.js
 * Tests database operations for track management
 */

import { jest } from '@jest/globals';
import {
  addTrack,
  updateTrack,
  getTracks,
  clearTracks,
  deleteTrack
} from '../../src/db/trackRepository.js';

// Mock the database module
jest.mock('../../src/db/database.js', () => {
  const mockPrepare = jest.fn();
  const mockRun = jest.fn();
  const mockAll = jest.fn();
  const mockGet = jest.fn();
  
  return {
    default: {
      prepare: mockPrepare,
    },
    __mockPrepare: mockPrepare,
    __mockRun: mockRun,
    __mockAll: mockAll,
    __mockGet: mockGet,
  };
});

describe('Track Repository', () => {
  let db;
  let mockPrepare;
  let mockRun;
  let mockAll;
  let mockGet;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    const dbModule = await import('../../src/db/database.js');
    db = dbModule.default;
    mockPrepare = dbModule.__mockPrepare;
    mockRun = dbModule.__mockRun;
    mockAll = dbModule.__mockAll;
    mockGet = dbModule.__mockGet;
  });

  describe('addTrack', () => {
    
    test('should insert a track and return ID', () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ lastInsertRowid: 123 })
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      const track = {
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        duration: 180,
        file_path: '/path/to/audio.mp3',
        file_hash: 'abc123',
        format: 'mp3',
        bitrate: 320000
      };
      
      const id = addTrack(track);
      
      expect(id).toBe(123);
      expect(mockPrepare).toHaveBeenCalled();
      expect(mockStmt.run).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        duration: 180,
        file_path: '/path/to/audio.mp3',
        file_hash: 'abc123',
        format: 'mp3',
        bitrate: 320000,
        created_at: expect.any(Number)
      }));
    });

    test('should handle missing optional fields', () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ lastInsertRowid: 456 })
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      const track = {
        title: 'Minimal Track',
        file_path: '/path/to/audio.mp3',
        file_hash: 'def456',
        format: 'mp3',
        bitrate: 128000
      };
      
      const id = addTrack(track);
      
      expect(id).toBe(456);
      expect(mockStmt.run).toHaveBeenCalledWith(expect.objectContaining({
        artist: '',
        album: '',
        duration: 0
      }));
    });

    test('should add created_at timestamp', () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ lastInsertRowid: 789 })
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      const beforeTime = Date.now();
      
      const track = {
        title: 'Test',
        file_path: '/test.mp3',
        file_hash: 'hash',
        format: 'mp3',
        bitrate: 192000
      };
      
      addTrack(track);
      
      const afterTime = Date.now();
      const callArgs = mockStmt.run.mock.calls[0][0];
      
      expect(callArgs.created_at).toBeGreaterThanOrEqual(beforeTime);
      expect(callArgs.created_at).toBeLessThanOrEqual(afterTime);
    });

    test('should use SQL INSERT statement', () => {
      const mockStmt = {
        run: jest.fn().mockReturnValue({ lastInsertRowid: 1 })
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      const track = {
        title: 'Test',
        file_path: '/test.mp3',
        file_hash: 'hash',
        format: 'mp3',
        bitrate: 192000
      };
      
      addTrack(track);
      
      const sql = mockPrepare.mock.calls[0][0];
      expect(sql).toContain('INSERT INTO tracks');
      expect(sql).toContain('title');
      expect(sql).toContain('artist');
      expect(sql).toContain('file_path');
    });
  });

  describe('updateTrack', () => {
    
    test('should update track fields', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      const updates = {
        bpm: 128,
        key_raw: 'C',
        key_camelot: '8B',
        energy: 7,
        loudness: -10
      };
      
      updateTrack(42, updates);
      
      expect(mockPrepare).toHaveBeenCalled();
      expect(mockStmt.run).toHaveBeenCalledWith(expect.objectContaining({
        id: 42,
        bpm: 128,
        key_raw: 'C',
        key_camelot: '8B',
        energy: 7,
        loudness: -10
      }));
    });

    test('should set analyzed flag to 1', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      updateTrack(1, { bpm: 120 });
      
      const sql = mockPrepare.mock.calls[0][0];
      expect(sql).toContain('analyzed = 1');
    });

    test('should handle empty updates', () => {
      updateTrack(1, {});
      
      // Should not call prepare if no fields to update
      expect(mockPrepare).not.toHaveBeenCalled();
    });

    test('should build dynamic SET clause', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      updateTrack(1, { bpm: 140, energy: 9 });
      
      const sql = mockPrepare.mock.calls[0][0];
      expect(sql).toContain('SET');
      expect(sql).toContain('bpm = @bpm');
      expect(sql).toContain('energy = @energy');
    });

    test('should update multiple fields at once', () => {
      const mockStmt = {
        run: jest.fn()
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      const updates = {
        bpm: 128,
        key_raw: 'Am',
        key_camelot: '11A',
        energy: 6,
        loudness: -12,
        rating: 4
      };
      
      updateTrack(99, updates);
      
      expect(mockStmt.run).toHaveBeenCalledWith(expect.objectContaining(updates));
    });
  });

  describe('getTracks', () => {
    
    test('should retrieve tracks with default pagination', () => {
      const mockTracks = [
        { id: 1, title: 'Track 1' },
        { id: 2, title: 'Track 2' }
      ];
      
      const mockStmt = {
        all: jest.fn().mockReturnValue(mockTracks)
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      const tracks = getTracks({ limit: 50, offset: 0 });
      
      expect(tracks).toEqual(mockTracks);
      expect(mockStmt.all).toHaveBeenCalledWith(50, 0);
    });

    test('should support custom pagination', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([])
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      getTracks({ limit: 100, offset: 200 });
      
      expect(mockStmt.all).toHaveBeenCalledWith(100, 200);
    });

    test('should search tracks by title, artist, or album', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([])
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      getTracks({ limit: 50, offset: 0, search: 'test' });
      
      const sql = mockPrepare.mock.calls[0][0];
      expect(sql).toContain('WHERE title LIKE @q');
      expect(sql).toContain('OR artist LIKE @q');
      expect(sql).toContain('OR album LIKE @q');
      
      expect(mockStmt.all).toHaveBeenCalledWith({
        q: '%test%',
        limit: 50,
        offset: 0
      });
    });

    test('should order by created_at DESC', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([])
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      getTracks({ limit: 50, offset: 0 });
      
      const sql = mockPrepare.mock.calls[0][0];
      expect(sql).toContain('ORDER BY created_at DESC');
    });

    test('should use LIKE with wildcards for search', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([])
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      getTracks({ search: 'rock' });
      
      expect(mockStmt.all).toHaveBeenCalledWith(expect.objectContaining({
        q: '%rock%'
      }));
    });

    test('should default limit to 50 and offset to 0', () => {
      const mockStmt = {
        all: jest.fn().mockReturnValue([])
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      getTracks({});
      
      expect(mockStmt.all).toHaveBeenCalledWith(50, 0);
    });
  });

  describe('deleteTrack', () => {
    
    test('should delete track by ID', () => {
      const mockTrack = { id: 1, file_path: '/path/to/file.mp3' };
      
      const mockGetStmt = {
        get: jest.fn().mockReturnValue(mockTrack)
      };
      const mockDeleteStmt = {
        run: jest.fn()
      };
      
      mockPrepare.mockReturnValueOnce(mockDeleteStmt) // DELETE FROM playlist_tracks
        .mockReturnValueOnce(mockGetStmt)              // SELECT file_path
        .mockReturnValueOnce(mockDeleteStmt);          // DELETE FROM tracks
      
      const result = deleteTrack(1);
      
      expect(result).toEqual(mockTrack);
      expect(mockPrepare).toHaveBeenCalledTimes(3);
    });

    test('should remove track from all playlists first', () => {
      const mockTrack = { id: 5, file_path: '/path.mp3' };
      
      const mockGetStmt = {
        get: jest.fn().mockReturnValue(mockTrack)
      };
      const mockDeletePlaylistStmt = {
        run: jest.fn()
      };
      const mockDeleteTrackStmt = {
        run: jest.fn()
      };
      
      mockPrepare.mockReturnValueOnce(mockDeletePlaylistStmt)
        .mockReturnValueOnce(mockGetStmt)
        .mockReturnValueOnce(mockDeleteTrackStmt);
      
      deleteTrack(5);
      
      const firstDeleteSql = mockPrepare.mock.calls[0][0];
      expect(firstDeleteSql).toContain('DELETE FROM playlist_tracks');
      expect(firstDeleteSql).toContain('track_id = ?');
      expect(mockDeletePlaylistStmt.run).toHaveBeenCalledWith(5);
    });

    test('should not delete audio file from disk', () => {
      // This is a design decision - we keep the file to avoid data loss
      const mockTrack = { id: 1, file_path: '/path/to/file.mp3' };
      
      const mockGetStmt = {
        get: jest.fn().mockReturnValue(mockTrack)
      };
      const mockDeleteStmt = {
        run: jest.fn()
      };
      
      mockPrepare.mockReturnValueOnce(mockDeleteStmt)
        .mockReturnValueOnce(mockGetStmt)
        .mockReturnValueOnce(mockDeleteStmt);
      
      const result = deleteTrack(1);
      
      expect(result.file_path).toBe('/path/to/file.mp3');
      // File should remain on disk (no fs.unlink call)
    });

    test('should return deleted track info', () => {
      const mockTrack = { 
        id: 7, 
        title: 'Deleted Track',
        file_path: '/path.mp3' 
      };
      
      const mockGetStmt = {
        get: jest.fn().mockReturnValue(mockTrack)
      };
      const mockDeleteStmt = {
        run: jest.fn()
      };
      
      mockPrepare.mockReturnValueOnce(mockDeleteStmt)
        .mockReturnValueOnce(mockGetStmt)
        .mockReturnValueOnce(mockDeleteStmt);
      
      const result = deleteTrack(7);
      
      expect(result).toEqual(mockTrack);
    });
  });

  describe('clearTracks', () => {
    
    test('should delete all tracks', () => {
      const mockDeleteStmt = {
        run: jest.fn()
      };
      const mockVacuumStmt = {
        run: jest.fn()
      };
      
      mockPrepare.mockReturnValueOnce(mockDeleteStmt)
        .mockReturnValueOnce(mockVacuumStmt);
      
      clearTracks();
      
      expect(mockPrepare).toHaveBeenCalledWith('DELETE FROM tracks');
      expect(mockDeleteStmt.run).toHaveBeenCalled();
    });

    test('should vacuum database after deletion', () => {
      const mockDeleteStmt = {
        run: jest.fn()
      };
      const mockVacuumStmt = {
        run: jest.fn()
      };
      
      mockPrepare.mockReturnValueOnce(mockDeleteStmt)
        .mockReturnValueOnce(mockVacuumStmt);
      
      clearTracks();
      
      expect(mockPrepare).toHaveBeenCalledWith('VACUUM');
      expect(mockVacuumStmt.run).toHaveBeenCalled();
    });

    test('should run vacuum after delete', () => {
      const mockDeleteStmt = {
        run: jest.fn()
      };
      const mockVacuumStmt = {
        run: jest.fn()
      };
      
      mockPrepare.mockReturnValueOnce(mockDeleteStmt)
        .mockReturnValueOnce(mockVacuumStmt);
      
      clearTracks();
      
      // Verify order: DELETE then VACUUM
      expect(mockPrepare.mock.calls[0][0]).toContain('DELETE');
      expect(mockPrepare.mock.calls[1][0]).toBe('VACUUM');
    });
  });

  describe('Error Handling', () => {
    
    test('should propagate database errors on insert', () => {
      const mockStmt = {
        run: jest.fn().mockImplementation(() => {
          throw new Error('Database constraint violation');
        })
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      expect(() => {
        addTrack({
          title: 'Test',
          file_path: '/test.mp3',
          file_hash: 'hash',
          format: 'mp3',
          bitrate: 192000
        });
      }).toThrow('Database constraint violation');
    });

    test('should handle query errors in getTracks', () => {
      const mockStmt = {
        all: jest.fn().mockImplementation(() => {
          throw new Error('Query failed');
        })
      };
      mockPrepare.mockReturnValue(mockStmt);
      
      expect(() => {
        getTracks({});
      }).toThrow('Query failed');
    });
  });
});
