#!/usr/bin/env python3
import sys
import json
import mixxx_analyzer


def analyze(path: str):
    r = mixxx_analyzer.analyze(path)
    print(json.dumps({
        "bpm":         r.bpm,
        "key_raw":     r.key,
        "key_camelot": r.camelot,
        "lufs":        r.lufs,
        "replay_gain": r.replay_gain,
        "intro_secs":  r.intro_secs,
        "outro_secs":  r.outro_secs,
    }))


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: analysis.py <audiofile>")
        sys.exit(1)

    analyze(sys.argv[1])
