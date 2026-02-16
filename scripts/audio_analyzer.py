#!/usr/bin/env python3
"""
Audio Analysis Script using Essentia
Extracts BPM, musical key, and LUFS loudness from audio files
"""

import sys
import json
import essentia
import essentia.standard as es
import numpy as np


def get_key_camelot(key, scale):
    """
    Convert Essentia key notation to Camelot wheel notation
    
    Args:
        key: Musical key (e.g., 'C', 'D#', 'F')
        scale: Scale type ('major' or 'minor')
    
    Returns:
        Camelot notation (e.g., '8B', '12A')
    """
    camelot_map = {
        'C': '8B',
        'C#': '3B',
        'Db': '3B',
        'D': '10B',
        'D#': '5B',
        'Eb': '5B',
        'E': '12B',
        'F': '7B',
        'F#': '2B',
        'Gb': '2B',
        'G': '9B',
        'G#': '4B',
        'Ab': '4B',
        'A': '11B',
        'A#': '6B',
        'Bb': '6B',
        'B': '1B',
    }
    
    base = camelot_map.get(key)
    if not base:
        return None
    
    number = base[:-1]
    letter = 'A' if scale == 'minor' else 'B'
    return f"{number}{letter}"


def analyze_audio(file_path):
    """
    Analyze audio file to extract BPM, key, and LUFS loudness
    
    Args:
        file_path: Path to the audio file
    
    Returns:
        Dictionary containing analysis results
    """
    try:
        # Load audio file
        loader = es.MonoLoader(filename=file_path)
        audio = loader()
        
        # Get sample rate
        sample_rate = loader.paramValue('sampleRate')
        
        # Extract BPM using RhythmExtractor2013
        rhythm_extractor = es.RhythmExtractor2013(method="multifeature")
        bpm, beats, beats_confidence, _, beats_intervals = rhythm_extractor(audio)
        
        # Extract musical key
        key_extractor = es.KeyExtractor()
        key, scale, strength = key_extractor(audio)
        
        # Calculate loudness using ReplayGain algorithm
        # This gives us a dB value similar to LUFS
        replay_gain = es.ReplayGain()
        gain = replay_gain(audio)
        
        # Convert ReplayGain to approximate LUFS
        # ReplayGain targets -18 dBFS, while EBU R128 targets -23 LUFS
        # The relationship is approximately: LUFS ≈ -18 - ReplayGain
        lufs = -18.0 - gain
        
        # Convert key to Camelot notation
        key_camelot = get_key_camelot(key, scale)
        
        # Format key in standard notation (e.g., "C# minor" or "D major")
        key_raw = f"{key} {scale}"
        
        return {
            'success': True,
            'bpm': float(bpm),
            'key_raw': key_raw,
            'key_camelot': key_camelot,
            'key': key,
            'scale': scale,
            'key_strength': float(strength),
            'loudness': float(lufs),
            'beats_confidence': float(beats_confidence)
        }
        
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }


def main():
    """Main entry point for command-line usage"""
    if len(sys.argv) < 2:
        print(json.dumps({
            'success': False,
            'error': 'No file path provided'
        }))
        sys.exit(1)
    
    file_path = sys.argv[1]
    result = analyze_audio(file_path)
    print(json.dumps(result, indent=2))
    
    if result['success']:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == '__main__':
    main()
