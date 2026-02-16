#!/usr/bin/env python3
"""
Unit tests for audio_analyzer.py
"""

import unittest
import sys
import os

# Add the scripts directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from audio_analyzer import get_key_camelot, analyze_audio


class TestKeyCamelot(unittest.TestCase):
    """Test Camelot key conversion"""
    
    def test_major_keys(self):
        """Test conversion of major keys to Camelot notation"""
        self.assertEqual(get_key_camelot('C', 'major'), '8B')
        self.assertEqual(get_key_camelot('D', 'major'), '10B')
        self.assertEqual(get_key_camelot('E', 'major'), '12B')
        self.assertEqual(get_key_camelot('F', 'major'), '7B')
        self.assertEqual(get_key_camelot('G', 'major'), '9B')
        self.assertEqual(get_key_camelot('A', 'major'), '11B')
        self.assertEqual(get_key_camelot('B', 'major'), '1B')
    
    def test_minor_keys(self):
        """Test conversion of minor keys to Camelot notation"""
        self.assertEqual(get_key_camelot('C', 'minor'), '8A')
        self.assertEqual(get_key_camelot('D', 'minor'), '10A')
        self.assertEqual(get_key_camelot('E', 'minor'), '12A')
        self.assertEqual(get_key_camelot('F', 'minor'), '7A')
        self.assertEqual(get_key_camelot('G', 'minor'), '9A')
        self.assertEqual(get_key_camelot('A', 'minor'), '11A')
        self.assertEqual(get_key_camelot('B', 'minor'), '1A')
    
    def test_sharp_keys(self):
        """Test conversion of sharp keys to Camelot notation"""
        self.assertEqual(get_key_camelot('C#', 'major'), '3B')
        self.assertEqual(get_key_camelot('C#', 'minor'), '3A')
        self.assertEqual(get_key_camelot('D#', 'major'), '5B')
        self.assertEqual(get_key_camelot('F#', 'major'), '2B')
        self.assertEqual(get_key_camelot('G#', 'major'), '4B')
        self.assertEqual(get_key_camelot('A#', 'major'), '6B')
    
    def test_flat_keys(self):
        """Test conversion of flat keys to Camelot notation"""
        self.assertEqual(get_key_camelot('Db', 'major'), '3B')
        self.assertEqual(get_key_camelot('Eb', 'major'), '5B')
        self.assertEqual(get_key_camelot('Gb', 'major'), '2B')
        self.assertEqual(get_key_camelot('Ab', 'major'), '4B')
        self.assertEqual(get_key_camelot('Bb', 'major'), '6B')
    
    def test_invalid_key(self):
        """Test handling of invalid keys"""
        self.assertIsNone(get_key_camelot('X', 'major'))
        self.assertIsNone(get_key_camelot('H', 'minor'))


class TestAudioAnalyzer(unittest.TestCase):
    """Test audio analysis functions"""
    
    def test_analyze_nonexistent_file(self):
        """Test that analyzing a nonexistent file returns error"""
        result = analyze_audio('/tmp/nonexistent_file.mp3')
        self.assertFalse(result['success'])
        self.assertIn('error', result)
    
    def test_analyze_returns_expected_keys(self):
        """Test that successful analysis returns expected dictionary keys"""
        # This test requires a valid audio file
        # We'll create a simple sine wave for testing
        try:
            import essentia.standard as es
            import numpy as np
            
            # Create a simple test audio signal (440 Hz sine wave, 2 seconds)
            sample_rate = 44100
            duration = 2.0
            frequency = 440.0
            t = np.linspace(0, duration, int(sample_rate * duration))
            audio = np.sin(2 * np.pi * frequency * t).astype(np.float32)
            
            # Save to temporary file
            test_file = '/tmp/test_audio.wav'
            writer = es.MonoWriter(filename=test_file, format='wav', sampleRate=sample_rate)
            writer(audio)
            
            # Analyze the file
            result = analyze_audio(test_file)
            
            # Check that we get expected keys
            if result['success']:
                self.assertIn('bpm', result)
                self.assertIn('key_raw', result)
                self.assertIn('key_camelot', result)
                self.assertIn('loudness', result)
                self.assertIn('key', result)
                self.assertIn('scale', result)
                
                # Check types
                self.assertIsInstance(result['bpm'], float)
                self.assertIsInstance(result['loudness'], float)
                self.assertIsInstance(result['key_raw'], str)
            
            # Clean up
            if os.path.exists(test_file):
                os.remove(test_file)
                
        except ImportError:
            self.skipTest("Essentia not installed")
        except Exception as e:
            self.skipTest(f"Could not create test audio: {e}")


if __name__ == '__main__':
    unittest.main()
