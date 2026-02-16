# DJ-Oriented Music Library Manager

## Overview

This project aims to build a **DJ-focused music library manager** designed around real DJ workflows rather than consumer music players. The application prioritizes **efficient library management**, **playlist curation**, **USB export**, **advanced filtering**, and **future-ready audio analysis**, while remaining fast, portable, and fully offline.

The core philosophy is:

* **One canonical music storage pool**
* **Playlists as views or exports, not duplicated files**
* **Metadata and analysis as first-class citizens**
* **Designed for DJs who actively prepare, organize, and play music**

The app will be cross-platform, dark-themed, and capable of handling **very large libraries** (tens or hundreds of thousands of tracks).

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
│   ├── main.js       # Application entry point
│   ├── preload.js    # Secure IPC bridge
│   ├── audio/        # Audio processing and analysis
│   └── db/           # SQLite database layer
├── renderer/          # React frontend
│   └── src/          # React components and UI
├── scripts/          # Utility scripts
├── test/             # Unit tests and fixtures
│   ├── fixtures/     # Test audio files
│   └── unit/         # Test suites
└── ffmpeg/           # FFmpeg binaries (auto-generated)
```

### Testing

Run the test suite to validate audio analysis logic:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage

# Generate test audio fixtures
npm run generate-fixtures
```

See [test/README.md](test/README.md) for more information about the testing infrastructure.

### Troubleshooting

**Issue: "FFmpeg binary not found"**
- Make sure FFmpeg is installed and in your system PATH
- Run the install script: `./scripts/install-ffmpeg.sh`

**Issue: "Cannot find module 'better-sqlite3'"**
- Run `npm install` again
- If that doesn't work, run `npm run postinstall` to rebuild native modules

**Issue: Port 5173 already in use**
- Kill any process using port 5173 or change the port in `renderer/vite.config.js`

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

* **FFmpeg** for decoding and format support
* Audio analysis libraries (e.g. Essentia, Aubio, KeyFinder)
* Worker threads for background analysis

### File Storage Strategy

* All imported audio files are stored **once** in a single managed folder
* Supported formats: MP3, FLAC, WAV, M4A
* Playlists are represented internally via database ordering
* Playlist export uses **symlinks or file copies**, depending on target

---

## Stage 1 – Core Library & Playlists (MVP)

### Features

* Dark-themed UI
* Import audio files into a managed storage folder
* Automatic metadata extraction
* Audio analysis:

  * BPM detection
  * Key detection (Camelot notation)
  * Duration
  * Bitrate & format

### Metadata Support

* Artist
* Title
* Album
* Genre (multi-value)
* Year
* Label
* BPM
* Musical key (Camelot + raw)
* Energy
* Loudness (LUFS)
* Duration
* Rating (stars)
* Comments / notes

### Playlist System

* Manual playlists with explicit ordering
* Tracks stored once, referenced many times
* Playlist ordering stored via numeric positions
* Sorting by BPM, key, or other fields
* Manual drag-and-drop reordering
* Save & renumber playlist order

### UI Layout

* Left sidebar: playlist list
* Main panel: track table with sortable columns
* Inline metadata editing
* Keyboard-friendly navigation

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
