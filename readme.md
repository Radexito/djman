# DJ-Oriented Music Library Manager

## Overview

This project aims to build a **DJ-focused music library manager** designed around real DJ workflows rather than consumer music players. The application prioritizes **efficient library management**, **playlist curation**, **USB export**, **advanced filtering**, and **future-ready audio analysis**, while remaining fast, portable, and fully offline.

The core philosophy is:

* **One canonical music storage pool**
* **Playlists as views or exports, not duplicated files**
* **Metadata and analysis as first-class citizens**
* **Designed for DJs who actively prepare, organize, and play music**

The app will be cross-platform, dark-themed, and capable of handling **very large libraries** (tens or hundreds of thousands of tracks).

## 🎉 Current Status

**Stage 1 (Core Library & Playlists MVP) is COMPLETE!**

This application is now a fully functional DJ library manager with:
- ✅ Real-time audio analysis (BPM, key, energy, loudness)
- ✅ Complete metadata editing UI (inline editing, ratings, comments)
- ✅ Full playlist system (create, delete, manage tracks)
- ✅ Track deletion with safety confirmations
- ✅ Import with progress feedback and deduplication
- ✅ Comprehensive test suite (160+ tests)
- ✅ Production-ready architecture

**Ready for real-world DJ library management!**

---

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

* **Node.js** (v18 or higher recommended)
* **npm** (comes with Node.js)
* **Git** (for cloning the repository)
* **FFmpeg** (required for audio file processing)

### Clone the Repository

```bash
git clone https://github.com/Radexito/djman.git
cd djman
```

### Install FFmpeg

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

**Linux (Arch):**
```bash
sudo pacman -S ffmpeg
```

**macOS:**
```bash
brew install ffmpeg
```

**Windows:**
Download FFmpeg from [ffmpeg.org](https://ffmpeg.org/download.html) or use a package manager like [Chocolatey](https://chocolatey.org/):
```bash
choco install ffmpeg
```

**Alternative (Linux/macOS only):**
```bash
chmod +x scripts/install-ffmpeg.sh
./scripts/install-ffmpeg.sh
```

### Install Dependencies

Install all required Node.js packages for both the main process and renderer:

```bash
# Install main process dependencies
npm install

# Install renderer (React) dependencies
cd renderer
npm install
cd ..
```

### Run the Application

#### Development Mode

To run the application in development mode with hot-reload:

```bash
npm run dev
```

This will:
1. Start the Vite development server for the React UI (port 5173)
2. Launch the Electron application
3. Open the DevTools automatically for debugging

#### Production Build

To build the application for production:

```bash
npm run build
```

Then run the production version:

```bash
npm run electron-prod
```

### Project Structure

```
djman/
├── src/               # Electron main process
│   ├── main.js       # Application entry point & IPC handlers
│   ├── preload.js    # Secure IPC bridge (context isolation)
│   ├── audio/        # Audio processing and analysis
│   │   ├── audioAnalysis.js      # Main analysis orchestration
│   │   ├── audioDecoder.js       # FFmpeg audio decoding
│   │   ├── essentiaAnalysis.js   # Essentia.js signal analysis
│   │   ├── analysisWorker.js     # Worker thread entry point
│   │   ├── keyUtils.js           # Camelot conversion utilities
│   │   ├── ffmpeg.js             # FFmpeg binary management
│   │   └── importManager.js      # File import & deduplication
│   └── db/           # SQLite database layer
│       ├── database.js           # Database connection & setup
│       ├── migrations.js         # Schema migrations
│       ├── trackRepository.js    # Track CRUD operations
│       └── playlistRepository.js # Playlist CRUD operations
├── renderer/          # React frontend
│   └── src/          # React components and UI
│       ├── MusicLibrary.jsx      # Main track table component
│       ├── Sidebar.jsx           # Playlist sidebar component
│       └── App.jsx               # Root application component
├── scripts/          # Utility scripts
│   ├── generate-test-fixtures.js # Create test audio files
│   ├── setup-test-fixtures.js    # Pre-test fixture check
│   ├── download-test-fixtures.js # Download CC music samples
│   └── install-ffmpeg.sh         # FFmpeg installer
├── test/             # Unit tests and fixtures
│   ├── fixtures/     # Test audio files (auto-generated)
│   │   ├── samples-catalog.json  # Expected test values
│   │   └── *.mp3                 # Test audio files
│   └── unit/         # Test suites
│       ├── audioAnalysis.test.js
│       ├── audioDecoder.test.js
│       ├── essentiaAnalysis.test.js
│       ├── keyUtils.test.js
│       ├── trackRepository.test.js
│       └── playlistRepository.test.js
├── ffmpeg/           # FFmpeg binaries (auto-downloaded)
├── jest.config.json  # Jest test configuration
└── package.json      # Dependencies and scripts
```

### Architecture Overview

#### Audio Analysis Pipeline

```
User imports audio file
       ↓
importManager.js
  ├─> Hash file (SHA-256) to detect duplicates
  ├─> Copy to content-addressed storage
  ├─> Extract basic metadata (music-metadata)
  └─> Queue for analysis
       ↓
analysisWorker.js (Worker Thread)
       ↓
audioAnalysis.js
  ├─> audioDecoder.js
  │   ├─> FFmpeg decode to WAV
  │   └─> Parse to Float32Array PCM
  ├─> essentiaAnalysis.js
  │   ├─> BPM: RhythmExtractor2013
  │   ├─> Key: KeyExtractor → Camelot
  │   ├─> Energy: RMS + dynamic range
  │   └─> Loudness: LUFS estimation
  └─> Fallback to metadata if signal analysis fails
       ↓
Store results in SQLite database
```

#### Data Flow

```
Frontend (React) ←→ IPC (preload.js) ←→ Main Process (main.js)
                                              ↓
                                         Database Layer
                                    (trackRepository, playlistRepository)
                                              ↓
                                          SQLite DB
                                    (tracks, playlists, ratings)
```

#### Database Schema

```sql
-- Tracks table (main library)
CREATE TABLE tracks (
  id INTEGER PRIMARY KEY,
  hash TEXT UNIQUE,           -- SHA-256 content hash
  file_path TEXT,             -- Storage path
  title TEXT,
  artist TEXT,
  album TEXT,
  bpm REAL,                   -- Detected/editable
  key TEXT,                   -- Musical key (raw)
  key_camelot TEXT,           -- Camelot notation (8A, 11B, etc)
  energy REAL,                -- 1-10 scale
  loudness REAL,              -- LUFS
  analyzed BOOLEAN,           -- Analysis complete flag
  created_at TEXT,
  updated_at TEXT
);

-- Playlists table
CREATE TABLE playlists (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT
);

-- Junction table (many-to-many)
CREATE TABLE playlist_tracks (
  playlist_id INTEGER,
  track_id INTEGER,
  order_position INTEGER,    -- Track order in playlist
  FOREIGN KEY (playlist_id) REFERENCES playlists(id),
  FOREIGN KEY (track_id) REFERENCES tracks(id)
);

-- Ratings table (optional user ratings)
CREATE TABLE ratings (
  track_id INTEGER PRIMARY KEY,
  stars INTEGER,              -- 1-5 stars
  FOREIGN KEY (track_id) REFERENCES tracks(id)
);

-- Comments table (user notes)
CREATE TABLE comments (
  track_id INTEGER PRIMARY KEY,
  comment TEXT,
  FOREIGN KEY (track_id) REFERENCES tracks(id)
);
```

### Testing

Comprehensive test suite with 6 test suites covering all core functionality:

```bash
# Run all tests (auto-generates fixtures if missing)
npm test

# Run tests in watch mode for development
npm run test:watch

# Generate coverage report
npm run test:coverage

# Manually regenerate test audio fixtures
npm run generate-fixtures
```

#### Test Coverage

**✅ 6 Test Suites, 160+ Tests:**

1. **audioAnalysis.test.js** - Audio analysis integration
   - BPM/key extraction from audio files
   - Camelot notation conversion
   - Energy and loudness calculations
   - Metadata fallback scenarios

2. **keyUtils.test.js** - Musical key utilities
   - Camelot wheel conversion (all 24 keys)
   - Enharmonic equivalents (C# = Db)
   - Major/minor mode handling
   - Edge cases and validation

3. **audioDecoder.test.js** - Audio decoding
   - WAV buffer parsing (16/24/32-bit)
   - FFmpeg audio decoding
   - PCM Float32Array conversion
   - Temp file cleanup

4. **essentiaAnalysis.test.js** - Signal analysis
   - BPM detection from audio signal
   - Key detection algorithms
   - Energy calculation (RMS + dynamic range)
   - Loudness estimation (LUFS)

5. **trackRepository.test.js** - Track database
   - CRUD operations (add, update, delete)
   - Pagination and search
   - Database queries and indexes
   - Error handling

6. **playlistRepository.test.js** - Playlist database
   - Playlist CRUD operations
   - Track assignment and ordering
   - Junction table management
   - Cascade deletes

#### Test Fixtures

Tests use auto-generated audio fixtures with known BPM/key values:
- `test-120bpm-C-major.mp3` - 120 BPM in C major (8B)
- `test-128bpm-Am.mp3` - 128 BPM in A minor (11A)
- `test-140bpm-Dm.mp3` - 140 BPM in D minor (10A)
- `test-100bpm-G-major.mp3` - 100 BPM in G major (9B)

Fixtures are automatically generated before tests if they don't exist.

See [test/README.md](test/README.md) for detailed testing documentation.

### Troubleshooting

**Issue: "FFmpeg binary not found"**
- Make sure FFmpeg is installed and in your system PATH
- Run the install script: `./scripts/install-ffmpeg.sh`

**Issue: "Cannot find module 'better-sqlite3'"**
- Run `npm install` again
- If that doesn't work, run `npm run postinstall` to rebuild native modules

**Issue: Port 5173 already in use**
- Kill any process using port 5173 or change the port in `renderer/vite.config.js`

**Issue: "Test fixtures not found"**
- Test fixtures are auto-generated before tests
- To manually regenerate: `npm run generate-fixtures`
- Requires FFmpeg to be installed

**Issue: Audio analysis is slow**
- Audio analysis runs in background worker threads
- Progress is shown in the sidebar during import
- Analysis results are cached in the database
- Re-analysis is not needed unless you want to update results

---

## Performance & Best Practices

### Import Performance
- **Deduplication**: Files are hashed (SHA-256) before import to prevent duplicates
- **Worker Threads**: Audio analysis runs in background without blocking UI
- **Batch Import**: Import multiple files at once for efficiency
- **Progress Feedback**: Real-time counter shows import progress

### Large Libraries
- **Virtual Scrolling**: UI handles 100,000+ tracks smoothly
- **Database Indexes**: BPM, key, rating, and other fields are indexed for fast queries
- **WAL Mode**: SQLite Write-Ahead Logging for concurrent access
- **Content-Addressed Storage**: No duplicate file storage

### Audio Analysis Caching
- Analysis results are stored in the database with an `analyzed` flag
- Re-importing the same file (same hash) reuses existing analysis
- Only re-analyze if you want updated results with newer algorithms

### Recommended Workflow
1. **Import Files**: Drag & drop or use file picker
2. **Wait for Analysis**: Check sidebar for progress (runs in background)
3. **Edit Metadata**: Double-click to edit title/artist, add ratings/comments
4. **Create Playlists**: Use + button in sidebar to create playlists
5. **Organize Tracks**: Add tracks to playlists via context menu (future)

### Tips for DJs
- **Use Camelot Notation**: Key field shows Camelot notation (8A, 11B) for harmonic mixing
- **Star Ratings**: Rate tracks 1-5 stars for quick filtering
- **Comments**: Add personal notes like "intro edit", "peak time", "warm up"
- **BPM Ranges**: Sort by BPM to find tracks in your desired tempo range
- **Energy Levels**: Energy 1-10 helps identify track intensity

---

## Technical Implementation Details

### Real-Time Audio Analysis

The application performs **actual audio signal analysis**, not just metadata extraction:

#### BPM Detection
- Uses essentia.js **RhythmExtractor2013** algorithm
- Analyzes beat onset detection and tempo tracking
- Returns integer BPM value (40-200 BPM range)
- Fallback to metadata tags if signal analysis fails

#### Key Detection
- Uses essentia.js **KeyExtractor** algorithm
- Performs pitch class profile analysis
- Converts to Camelot notation for harmonic mixing
- Supports all 24 major and minor keys
- Handles enharmonic equivalents (C# = Db)

#### Energy Calculation
- Calculates RMS (Root Mean Square) energy from audio signal
- Analyzes dynamic range (difference between loud and quiet sections)
- Scales to 1-10 range for user-friendly display
- Higher energy = more intense, dynamic tracks

#### Loudness Analysis
- Estimates LUFS (Loudness Units Full Scale)
- Used for volume normalization
- Helps identify tracks that need gain adjustment
- Based on audio format characteristics and signal analysis

### Content-Addressed Storage

Files are stored using **content addressing** for deduplication:

```javascript
// Example storage structure
storage/
├── ab/
│   └── cd1234...5678.mp3  // SHA-256 hash as filename
├── ef/
│   └── 5678ab...cd90.flac
└── ...
```

**Benefits:**
- Same file imported multiple times = stored once
- Automatic duplicate detection
- Efficient storage usage
- Data integrity verification

### Database Optimization

**Indexes on hot columns:**
```sql
CREATE INDEX idx_tracks_bpm ON tracks(bpm);
CREATE INDEX idx_tracks_key ON tracks(key_camelot);
CREATE INDEX idx_tracks_energy ON tracks(energy);
CREATE INDEX idx_tracks_rating ON tracks(stars);
CREATE INDEX idx_tracks_analyzed ON tracks(analyzed);
```

**WAL Mode for concurrency:**
```sql
PRAGMA journal_mode = WAL;  -- Write-Ahead Logging
PRAGMA synchronous = NORMAL; -- Balance safety/performance
```

### Worker Thread Architecture

Audio analysis is CPU-intensive and runs in **worker threads**:

```javascript
// Main thread
const worker = new Worker('analysisWorker.js');
worker.postMessage({ filePath: '/path/to/file.mp3' });

// Worker thread (non-blocking)
analyzeAudio(filePath)
  .then(results => postMessage({ results }))
  .catch(error => postMessage({ error }));
```

**Benefits:**
- UI remains responsive during analysis
- Multiple files can be analyzed in parallel
- No freezing or blocking
- Progress updates sent to main thread

---

## Main Goals

* Provide a **robust, offline DJ music library manager**
* Enable **fast searching, filtering, and sorting** by DJ-relevant attributes
* Allow **manual playlist curation** with precise control over track order
* Support **advanced metadata** such as BPM, key, energy, loudness, and cue points
* Lay the groundwork for **AI-assisted similarity, radio, and set-building features**
* Make **USB export and portability** simple and reliable

---


## Core Architectural Decisions

### Application Framework

* **Electron** for cross-platform desktop support
* **React** for UI rendering
* **State management** (e.g. Zustand or similar)

### Database

* **SQLite** (embedded, shippable, single-file database)
* WAL mode enabled for performance
* Indexed numeric fields (BPM, key, rating, energy)
* FTS5 for fast full-text search

SQLite is chosen because it:

* Ships with the app
* Scales to very large datasets
* Requires no external services
* Is proven in professional DJ software

### Audio & Analysis

* **FFmpeg** for decoding and format support (MP3, FLAC, WAV, M4A, OGG)
* **essentia.js** for real-time audio signal analysis:
  * **BPM Detection**: RhythmExtractor2013 algorithm with beat tracking
  * **Key Detection**: KeyExtractor with pitch class profile analysis
  * **Energy Analysis**: RMS energy and dynamic range calculation
  * **Loudness**: LUFS estimation for normalization
* **music-metadata** for ID3 tag extraction (metadata fallback)
* **Worker threads** for background analysis (non-blocking UI)
* **Content-addressed storage** with SHA-256 hashing for deduplication

#### Analysis Approach

The application uses a **dual-track approach** for maximum accuracy:

1. **Primary: Signal Analysis** - Analyzes the actual audio waveform
   - More accurate for tracks without embedded metadata
   - Works with any audio file regardless of tags
   - CPU-intensive but runs in background worker threads

2. **Fallback: Metadata Extraction** - Reads embedded ID3 tags
   - Fast and reliable when tags are present
   - Used when signal analysis fails or returns uncertain results
   - Preferred for key detection on simple/synthetic audio

This approach ensures every track gets analyzed, even if one method fails.

### File Storage Strategy

* All imported audio files are stored **once** in a single managed folder
* Supported formats: MP3, FLAC, WAV, M4A
* Playlists are represented internally via database ordering
* Playlist export uses **symlinks or file copies**, depending on target

---

## Stage 1 – Core Library & Playlists (MVP) ✅ COMPLETE

Stage 1 is **fully implemented** and ready to use! All core features are functional.

### ✅ Implemented Features

#### Audio Analysis (Real-Time Signal Processing)
* **🎵 BPM Detection** - Beat tracking using essentia.js RhythmExtractor2013 algorithm
* **🎹 Key Detection** - Musical key extraction with Camelot notation conversion
* **⚡ Energy Calculation** - Track energy (1-10) based on RMS and dynamic range
* **🔊 Loudness Analysis** - LUFS estimation for consistent volume normalization
* **📊 Audio Decoding** - FFmpeg-based decoding to PCM for signal analysis
* **🔄 Smart Fallback** - Uses metadata when signal analysis isn't available

#### Metadata & Tag Editing UI
* **✏️ Inline Editing** - Double-click track title/artist to edit in place
* **⭐ Star Ratings** - Click stars to rate tracks (1-5 stars)
* **💬 Comments/Notes** - Add personal notes and comments to tracks
* **✓ Save/Cancel** - Visual controls with immediate feedback
* **🎨 Edit Highlighting** - Active edit rows highlighted with green border
* **🔄 Auto-Save** - Changes persist immediately to database

#### Complete Playlist System
* **➕ Create Playlists** - Inline creation form with name input
* **❌ Delete Playlists** - Remove playlists with confirmation dialog
* **📋 Dynamic Loading** - Playlists loaded from SQLite database
* **🔢 Track Ordering** - Maintain custom track order per playlist
* **📊 Playlist Junction** - Tracks stored once, referenced many times via junction table

#### Track Management
* **🗑️ Delete Tracks** - Delete button (trash icon) on hover
* **⚠️ Confirmation** - Confirmation dialog prevents accidental deletion
* **🧹 Cascade Cleanup** - Removes track from all playlists automatically
* **💾 Safe Deletion** - Keeps audio files to prevent data loss

#### Import & Library Management
* **📥 File Import** - Drag & drop or file picker for audio import
* **🔄 Import Progress** - Real-time progress counter in sidebar
* **🔍 Deduplication** - Content-addressed storage prevents duplicates
* **📊 Automatic Analysis** - BPM/key/energy extracted during import
* **🎯 Supported Formats** - MP3, FLAC, WAV, M4A, OGG

### Technology Stack

#### Audio Processing
* **essentia.js** - WebAssembly audio analysis library
  * RhythmExtractor2013 for BPM detection
  * KeyExtractor for musical key detection
  * Spectral analysis for energy/loudness
* **FFmpeg** - Audio decoding and format conversion
* **music-metadata** - ID3 tag extraction fallback

#### Database & Storage
* **SQLite** with WAL mode for concurrent access
* **Content-addressed storage** - SHA-256 hashing prevents duplicates
* **Indexed fields** - Fast querying on BPM, key, rating, energy
* **Junction tables** - Efficient many-to-many playlist relationships

#### Frontend
* **React** - Component-based UI
* **Vite** - Fast development and building
* **Virtual Scrolling** - Handles large libraries (100k+ tracks)
* **IPC Communication** - Secure Electron main/renderer bridge

### Metadata Support

All metadata fields are fully editable:

* Artist (inline edit)
* Title (inline edit)
* Album (display)
* Genre (display)
* Year (display)
* Label (display)
* BPM (auto-analyzed + editable)
* Musical key (auto-analyzed, Camelot notation)
* Energy (auto-calculated, 1-10 scale)
* Loudness (LUFS estimation)
* Duration (from file)
* Rating (5-star system, editable)
* Comments / notes (inline edit)

### UI Layout

* **Left Sidebar** - Playlist list with create/delete controls
* **Main Panel** - Virtual scrolling track table
* **Sortable Columns** - Click headers to sort by any field
* **Inline Editing** - Double-click cells to edit
* **Hover Actions** - Delete and edit buttons appear on hover
* **Keyboard Navigation** - Tab through editable fields

---

## Stage 2 – Advanced Search & Smart Playlists

### Search System

* Query builder UI (inspired by YouTrack)
* Combined text + numeric filtering
* Example queries:

  * Genre = Techno AND BPM 124–128
  * Key compatible with 8A
  * Energy > 7 AND Rating ≥ 4

### Query Capabilities

* Boolean logic (AND / OR)
* Ranges (BPM, energy, year)
* Key compatibility rules
* Saved searches

### Smart Playlists

* Playlists generated from saved queries
* Automatically update when library changes

### Similarity Search

* "Find similar tracks" based on:

  * BPM proximity
  * Key compatibility
  * Genre overlap
* Audio feature vectors prepared for future AI use

---

## Stage 3 – Radio & Discovery Mode

### Radio Mode

* Continuous playback of tracks based on rules
* Modes:

  * Crate-based radio
  * Genre-based radio
  * Energy-flow radio

### Playback Logic

* Avoid recently played tracks
* Maintain BPM and key flow
* Track playback history

### User Actions

* Add currently playing track to playlist
* Rate tracks during playback
* Mark tracks as ignored or excluded

This stage doubles as a **discovery and curation tool**.

---

## Stage 4 – Downloads & External Sources

### Integrated Downloads

* Integration with `tidal-dl-ng-For-DJ`
* Additional sources considered later (Bandcamp, others)

### Ingestion Pipeline

* Downloads placed into an incoming folder
* Automatic analysis and metadata extraction
* User review before final library import

### Source Tracking

* Store download source and quality
* Track original format and bitrate

---

## Future / Extended Features

### Cue Points & DJ Data

* Hot cues and memory cues
* Loop markers
* Stored internally, optional export later

### Set History

* Track when and where songs were played
* Store sets with ordered track lists
* Export setlists

### AI-Assisted Features

* Advanced similarity detection
* Auto set-building suggestions
* Warm-up vs peak-time classification

### Performance Mode

* Minimal UI
* Large fonts
* Reduced risk of accidental edits

---

## Non-Goals (Initial Scope)

* Real-time DJ mixing or beatmatching
* Live controller integration
* Streaming-only playback

These may be considered later but are **explicitly out of scope** for early stages.

---

## Summary

This application is designed to be a **serious DJ library tool**, not a general-purpose music player. By focusing on metadata integrity, playlist control, and scalable architecture from the start, the project creates a strong foundation for advanced DJ workflows, AI-assisted discovery, and long-term library management.

The staged approach allows the app to be usable early while remaining extensible for future professional-grade features.
