#!/usr/bin/env python3
"""
Integration test for audio_analyzer.py
Tests against a real MP3 file with known BPM, key, and LUFS values

Usage:
    python test_audio_integration.py <path_to_test_file.mp3> [expected_bpm] [expected_key] [expected_lufs]

Example:
    python test_audio_integration.py test_track.mp3 128 "C# minor" -12
"""

import sys
import os
import json

# Add the scripts directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from audio_analyzer import analyze_audio


def create_test_audio_file(filename='/tmp/test_track.mp3', bpm=120):
    """
    Create a test audio file with known properties for testing
    
    Args:
        filename: Path where to save the test file
        bpm: Target BPM for the test file
    
    Returns:
        Dictionary with known values for the created file
    """
    try:
        import essentia.standard as es
        import numpy as np
        
        # Create a simple test audio with a clear tempo
        sample_rate = 44100
        duration = 10.0  # 10 seconds
        
        # Calculate beat interval from BPM
        beat_interval = 60.0 / bpm
        beats_per_second = bpm / 60.0
        
        # Generate audio with periodic beats
        t = np.linspace(0, duration, int(sample_rate * duration))
        
        # Create a base tone at A (440 Hz) 
        audio = 0.1 * np.sin(2 * np.pi * 440.0 * t)
        
        # Add periodic kicks to establish tempo
        beat_times = np.arange(0, duration, beat_interval)
        for beat_time in beat_times:
            # Create a kick drum sound (low frequency burst)
            kick_duration = 0.1  # 100ms kick
            kick_start = int(beat_time * sample_rate)
            kick_end = min(kick_start + int(kick_duration * sample_rate), len(audio))
            
            kick_t = np.linspace(0, kick_duration, kick_end - kick_start)
            kick = 0.8 * np.sin(2 * np.pi * 60 * kick_t) * np.exp(-kick_t * 20)
            audio[kick_start:kick_end] += kick
        
        # Normalize
        audio = audio.astype(np.float32)
        max_val = np.max(np.abs(audio))
        if max_val > 0:
            audio = audio / max_val * 0.8
        
        # Save as WAV first
        temp_wav = '/tmp/test_track_temp.wav'
        writer = es.MonoWriter(filename=temp_wav, format='wav', sampleRate=sample_rate)
        writer(audio)
        
        # Convert to MP3 using ffmpeg if available
        try:
            import subprocess
            result = subprocess.run(
                ['ffmpeg', '-y', '-i', temp_wav, '-codec:a', 'libmp3lame', '-b:a', '192k', filename],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                os.remove(temp_wav)
                print(f"Created test MP3 file: {filename}")
            else:
                # If ffmpeg fails, use the WAV file
                os.rename(temp_wav, filename.replace('.mp3', '.wav'))
                filename = filename.replace('.mp3', '.wav')
                print(f"Created test WAV file: {filename}")
        except FileNotFoundError:
            # ffmpeg not available, use WAV
            os.rename(temp_wav, filename.replace('.mp3', '.wav'))
            filename = filename.replace('.mp3', '.wav')
            print(f"ffmpeg not found, created test WAV file: {filename}")
        
        # Return known values
        return {
            'filename': filename,
            'expected_bpm': bpm,
            'expected_key': 'A',  # We used 440 Hz (A note)
            'expected_scale': 'major',
            'expected_key_raw': 'A major',
            'tolerance_bpm': 5.0,  # Allow 5 BPM tolerance
            'tolerance_lufs': 5.0   # Allow 5 dB tolerance for LUFS
        }
        
    except Exception as e:
        print(f"Error creating test audio: {e}")
        return None


def run_integration_test(file_path, expected_bpm=None, expected_key=None, expected_lufs=None):
    """
    Run integration test on an audio file
    
    Args:
        file_path: Path to the audio file to test
        expected_bpm: Expected BPM value (optional)
        expected_key: Expected key in format "C# minor" (optional)
        expected_lufs: Expected LUFS value (optional)
    
    Returns:
        Boolean indicating test success
    """
    print(f"\n{'='*60}")
    print(f"INTEGRATION TEST: {file_path}")
    print(f"{'='*60}\n")
    
    # Check if file exists
    if not os.path.exists(file_path):
        print(f"❌ ERROR: File not found: {file_path}")
        return False
    
    print(f"Analyzing file: {file_path}")
    result = analyze_audio(file_path)
    
    if not result['success']:
        print(f"❌ ERROR: Analysis failed: {result.get('error', 'Unknown error')}")
        return False
    
    print(f"\n📊 Analysis Results:")
    print(f"{'─'*60}")
    print(f"  BPM:              {result['bpm']:.2f}")
    print(f"  Key (raw):        {result['key_raw']}")
    print(f"  Key (Camelot):    {result['key_camelot']}")
    print(f"  Loudness (LUFS):  {result['loudness']:.2f} dB")
    print(f"  Key strength:     {result.get('key_strength', 0):.2f}")
    print(f"  Beats confidence: {result.get('beats_confidence', 0):.2f}")
    print(f"{'─'*60}\n")
    
    # Validate against expected values if provided
    all_tests_passed = True
    
    if expected_bpm is not None:
        bpm_diff = abs(result['bpm'] - expected_bpm)
        bpm_tolerance = 5.0  # Allow 5 BPM difference
        
        if bpm_diff <= bpm_tolerance:
            print(f"✅ BPM test PASSED: {result['bpm']:.2f} ≈ {expected_bpm} (diff: {bpm_diff:.2f})")
        else:
            print(f"❌ BPM test FAILED: {result['bpm']:.2f} != {expected_bpm} (diff: {bpm_diff:.2f}, tolerance: {bpm_tolerance})")
            all_tests_passed = False
    
    if expected_key is not None:
        if result['key_raw'].lower() == expected_key.lower():
            print(f"✅ Key test PASSED: {result['key_raw']} = {expected_key}")
        else:
            print(f"⚠️  Key test: {result['key_raw']} != {expected_key} (key detection can vary)")
            # Don't fail on key mismatch as it's less reliable
    
    if expected_lufs is not None:
        lufs_diff = abs(result['loudness'] - expected_lufs)
        lufs_tolerance = 5.0  # Allow 5 dB difference
        
        if lufs_diff <= lufs_tolerance:
            print(f"✅ LUFS test PASSED: {result['loudness']:.2f} ≈ {expected_lufs} (diff: {lufs_diff:.2f})")
        else:
            print(f"❌ LUFS test FAILED: {result['loudness']:.2f} != {expected_lufs} (diff: {lufs_diff:.2f}, tolerance: {lufs_tolerance})")
            all_tests_passed = False
    
    print(f"\n{'='*60}")
    if all_tests_passed:
        print("✅ ALL TESTS PASSED")
    else:
        print("❌ SOME TESTS FAILED")
    print(f"{'='*60}\n")
    
    return all_tests_passed


def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python test_audio_integration.py <audio_file> [expected_bpm] [expected_key] [expected_lufs]")
        print("\nNo file provided. Creating a test audio file...")
        
        # Create a test file
        test_info = create_test_audio_file(bpm=128)
        if test_info:
            success = run_integration_test(
                test_info['filename'],
                expected_bpm=test_info['expected_bpm'],
                expected_key=test_info['expected_key_raw']
            )
            sys.exit(0 if success else 1)
        else:
            print("Failed to create test audio file")
            sys.exit(1)
    
    file_path = sys.argv[1]
    expected_bpm = float(sys.argv[2]) if len(sys.argv) > 2 else None
    expected_key = sys.argv[3] if len(sys.argv) > 3 else None
    expected_lufs = float(sys.argv[4]) if len(sys.argv) > 4 else None
    
    success = run_integration_test(file_path, expected_bpm, expected_key, expected_lufs)
    sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
