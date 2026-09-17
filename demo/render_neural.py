"""Generate the Bountiq demo voice-over.

Reuses the same Microsoft Edge neural voice profile as the Sway project:
en-US-JennyNeural, rate -10%, calm female product narration.

The local machine has a broken CA bundle, so TLS verification is disabled for
the Edge endpoint exactly as in video-analysis/render_neural.py.
"""

import asyncio
import json
import ssl
import subprocess
from pathlib import Path

import aiohttp
import edge_tts
import edge_tts.communicate as communicate

BASE = Path(__file__).parent
VOICE_DIR = BASE / "voice"
VOICE = "en-US-JennyNeural"
RATE = "-10%"


def duration_seconds(path: Path) -> float:
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True, check=True,
    )
    return round(float(out.stdout.strip()), 3)


async def main() -> None:
    communicate._SSL_CTX = ssl._create_unverified_context()
    original = aiohttp.TCPConnector.__init__

    def without_broken_local_ca(self, *args, **kwargs):
        kwargs["ssl"] = False
        original(self, *args, **kwargs)

    aiohttp.TCPConnector.__init__ = without_broken_local_ca

    scenes = json.loads((BASE / "scenes.json").read_text(encoding="utf-8"))["scenes"]
    VOICE_DIR.mkdir(exist_ok=True)

    timeline = []
    for scene in scenes:
        target = VOICE_DIR / f"{scene['id']}.mp3"
        speech = edge_tts.Communicate(scene["text"], voice=VOICE, rate=RATE)
        await speech.save(str(target))
        seconds = duration_seconds(target)
        timeline.append({"id": scene["id"], "file": target.name, "seconds": seconds, "minHold": scene.get("minHold", 0)})
        print(f"{scene['id']:<14} {seconds:>6.2f}s  {target.stat().st_size:>8} bytes", flush=True)

    total = round(sum(s["seconds"] for s in timeline), 2)
    (BASE / "voice-timeline.json").write_text(
        json.dumps({"voice": VOICE, "rate": RATE, "totalSeconds": total, "scenes": timeline}, indent=2),
        encoding="utf-8",
    )
    print(f"\ntotal narration: {total}s")


if __name__ == "__main__":
    asyncio.run(main())