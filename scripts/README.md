# Audio Analysis Implementation

This directory contains the Python-based audio analysis system using Essentia for extracting BPM, musical key, and LUFS loudness from audio tracks.

## Overview

The audio analysis system extracts the following information from audio files:

- **BPM (Beats Per Minute)**: Tempo detection using Essentia's RhythmExtractor2013
- **Musical Key**: Key and scale detection with Camelot wheel notation for DJ mixing
- **Loudness (LUFS)**: Integrated loudness measurement for gain staging

## Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Install Dependencies

```bash
pip3 install -r scripts/requirements.txt
```

This will install:
- `essentia`: Audio analysis library
- `numpy`: Numerical computing
- `pyloudnorm`: Loudness normalization

## Usage

### Command Line

Run the audio analyzer directly from the command line:

```bash
python3 scripts/audio_analyzer.py /path/to/audio/file.mp3
```

Output (JSON):
```json
{
  "success": true,
  "bpm": 128.5,
  "key_raw": "C# minor",
  "key_camelot": "12A",
  "key": "C#",
  "scale": "minor",
  "key_strength": 0.85,
  "loudness": -12.3,
  "beats_confidence": 4.2
}
```

### From Node.js (Electron App)

The `analysisWorker.js` automatically calls the Python script:

```javascript
import { Worker } from 'worker_threads';

const worker = new Worker('./src/audio/analysisWorker.js', {
  workerData: { filePath: '/path/to/audio.mp3' }
});

worker.on('message', (result) => {
  console.log('BPM:', result.bpm);
  console.log('Key:', result.key_raw);
  console.log('Camelot:', result.key_camelot);
  console.log('Loudness:', result.loudness);
});
```

## Testing

### Unit Tests

Test the core functionality without audio files:

```bash
python3 scripts/test_audio_analyzer.py -v
```

Tests include:
- Camelot wheel conversion (major/minor keys)
- Sharp and flat key handling
- Error handling for invalid files

### Integration Tests

Test with real audio files:

```bash
# Create and test a synthetic audio file
python3 scripts/test_audio_integration.py

# Test with your own MP3 file
python3 scripts/test_audio_integration.py /path/to/track.mp3 128 "C# minor" -12
```

Arguments:
- `file_path`: Path to audio file
- `expected_bpm`: Expected BPM (optional)
- `expected_key`: Expected key like "C# minor" (optional)
- `expected_lufs`: Expected LUFS value (optional)

## Technical Details

### BPM Detection

Uses Essentia's `RhythmExtractor2013` with multifeature method:
- Analyzes multiple audio features (onset, beat histograms, etc.)
- Robust to tempo changes and complex rhythms
- Returns BPM with confidence score

### Key Detection

Uses Essentia's `KeyExtractor`:
- Analyzes harmonic content via chromagram
- Returns key, scale (major/minor), and strength
- Converts to Camelot notation for DJ use

#### Camelot Wheel

The Camelot system simplifies harmonic mixing:
- Numbers 1-12 represent musical keys
- Letter A = minor, B = major
- Adjacent keys (±1) and same number (A↔B) mix well

Example: 12A (C# minor) → 12B (E major), 11A (A minor), 1A (D minor)

### Loudness Measurement

Uses Essentia's `ReplayGain` algorithm:
- Calculates perceived loudness
- Approximates LUFS (EBU R128 standard)
- Useful for gain normalization

Formula: `LUFS ≈ -18 - ReplayGain`

## Performance

- Typical analysis time: 2-5 seconds per track
- Memory usage: ~200MB for Python + Essentia
- CPU-intensive: Consider using worker threads

## Error Handling

The system gracefully handles errors:
- Invalid file paths
- Unsupported formats
- Corrupted audio files

On error, returns default values:
```json
{
  "success": false,
  "error": "Error message here"
}
```

The Node.js worker falls back to placeholder values if Python fails.

## Supported Formats

Through Essentia/FFmpeg:
- MP3
- FLAC
- WAV
- M4A
- AAC
- OGG
- And more...

## Future Improvements

Potential enhancements:
- [ ] True LUFS calculation using EBU R128 (requires stereo audio handling)
- [ ] Waveform generation for visualization
- [ ] Beat grid detection for DJ software integration
- [ ] Caching of analysis results
- [ ] Batch processing mode
- [ ] GPU acceleration for faster analysis

## References

- [Essentia Documentation](https://essentia.upf.edu/documentation/)
- [Camelot Wheel](https://www.harmonic-mixing.com/howto.aspx)
- [EBU R128 LUFS Standard](https://tech.ebu.ch/loudness)

## License

Part of the DJ Manager project. See main repository for license details.
