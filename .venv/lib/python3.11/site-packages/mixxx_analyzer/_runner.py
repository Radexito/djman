"""Subprocess wrapper that locates and calls the bundled mixxx-analyzer binary."""

import json
import os
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional


@dataclass
class AnalysisResult:
    file: str
    bpm: Optional[float]
    key: str
    camelot: str
    lufs: float
    replay_gain: float
    intro_secs: float
    outro_secs: float

    @classmethod
    def from_dict(cls, d: dict) -> "AnalysisResult":
        return cls(
            file=d["file"],
            bpm=d.get("bpm"),
            key=d["key"],
            camelot=d["camelot"],
            lufs=d["lufs"],
            replay_gain=d["replayGain"],
            intro_secs=d["introSecs"],
            outro_secs=d["outroSecs"],
        )


def _find_binary() -> str:
    """Return path to the mixxx-analyzer binary (bundled or on PATH)."""
    suffix = ".exe" if sys.platform == "win32" else ""
    bundled = Path(__file__).parent / "bin" / f"mixxx-analyzer{suffix}"
    if bundled.exists() and os.access(bundled, os.X_OK):
        return str(bundled)

    import shutil

    on_path = shutil.which("mixxx-analyzer")
    if on_path:
        return on_path

    raise FileNotFoundError(
        "mixxx-analyzer binary not found. "
        "Install the platform-specific mixxx-analyzer wheel or ensure "
        "the binary is on PATH."
    )


def analyze(path: str) -> AnalysisResult:
    """Analyze a single audio file.

    Returns an AnalysisResult with BPM, key, Camelot notation,
    LUFS loudness, ReplayGain, and intro/outro timestamps.

    Raises subprocess.CalledProcessError if the binary fails.
    Raises FileNotFoundError if the binary is not installed.
    """
    return analyze_many([path])[0]


def analyze_many(paths: List[str]) -> List[AnalysisResult]:
    """Analyze multiple audio files in a single binary invocation.

    More efficient than calling analyze() in a loop for large batches.
    """
    binary = _find_binary()
    proc = subprocess.run(
        [binary, "--json"] + list(paths),
        capture_output=True,
        text=True,
        check=True,
    )
    return [AnalysisResult.from_dict(d) for d in json.loads(proc.stdout)]
