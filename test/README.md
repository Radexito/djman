# Audio Analysis Testing

This directory contains unit tests and fixtures for validating the audio analysis extraction logic.

## Test Structure

```
test/
├── fixtures/          # Test audio files and expected values
│   ├── expected-values.json
│   ├── samples-catalog.json
│   └── *.mp3         # Generated test audio files (gitignored)
└── unit/             # Unit test suites
    ├── audioAnalysis.test.js
    └── keyUtils.test.js
```

## Test Fixtures

Test fixtures are small MP3 files with known BPM and key values embedded in their metadata. These are generated using FFmpeg and include:

| File | BPM | Key | Camelot |
|------|-----|-----|---------|
| `test-120bpm-C-major.mp3` | 120 | C | 8B |
| `test-128bpm-Am.mp3` | 128 | Am | 11A |
| `test-140bpm-Dm.mp3` | 140 | Dm | 10A |
| `test-100bpm-G-major.mp3` | 100 | G | 9B |

## Generating Test Fixtures

To regenerate the test audio files:

```bash
npm run generate-fixtures
```

This script:
1. Creates small 2-second audio files using FFmpeg
2. Embeds BPM and key metadata in ID3 tags
3. Saves them to `test/fixtures/`

**Requirements:** FFmpeg must be installed on your system.

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm run test:watch
```

### Run tests with coverage
```bash
npm run test:coverage
```

## Test Suites

### audioAnalysis.test.js

Tests the main audio analysis logic:
- **BPM Extraction**: Validates BPM is correctly extracted from ID3 tags and comments
- **Key Extraction**: Tests key extraction from multiple tag formats
- **Camelot Conversion**: Verifies musical keys are correctly converted to Camelot notation
- **Energy Calculation**: Tests energy estimation based on format properties
- **Loudness Calculation**: Validates LUFS approximation
- **Edge Cases**: Tests handling of invalid inputs and missing data

### keyUtils.test.js

Tests the Camelot wheel conversion utilities:
- Major and minor key conversions
- Sharp and flat key handling
- Enharmonic equivalents (e.g., C# = Db)
- Camelot wheel structure validation (1-12 positions, A/B suffixes)

## Test Data Format

### expected-values.json

Contains the ground truth values for each test fixture:

```json
{
  "description": "Expected values for test audio fixtures",
  "samples": [
    {
      "filename": "test-120bpm-C-major.mp3",
      "expected": {
        "bpm": 120,
        "key_raw": "C",
        "key_camelot": "8B"
      }
    }
  ]
}
```

## Writing New Tests

To add new test cases:

1. Add sample definition to `scripts/generate-test-fixtures.js`
2. Run `npm run generate-fixtures` to create the audio file
3. Update `expected-values.json` with the expected output
4. Add test assertions in the relevant test file

Example:

```javascript
test('should extract BPM correctly', async () => {
  const result = await analyzeAudio('test/fixtures/my-new-test.mp3');
  expect(result.bpm).toBe(128);
});
```

## CI/CD Integration

Tests are designed to run in CI environments:
- Uses Jest with ESM support
- Test fixtures are generated during CI setup (requires FFmpeg)
- No external dependencies or network requests
- Fast execution (<1 second for full suite)

## Notes

- Test audio files are small (32KB each) and contain simple sine waves
- The audio content itself doesn't matter - we're testing metadata extraction
- Tests validate against known embedded metadata, not actual audio analysis
- For real BPM/key detection from audio signal, additional ML-based tests would be needed
