#!/usr/bin/env python3

from __future__ import annotations

import sys
from pathlib import Path

import imageio.v2 as iio


def main() -> int:
    if len(sys.argv) != 3:
        print("Usage: reverse_video.py <input> <output>", file=sys.stderr)
        return 1

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    reader = iio.get_reader(input_path, format="FFMPEG")
    metadata = reader.get_meta_data()
    fps = metadata.get("fps") or 24
    frames = [frame for frame in reader]
    reader.close()

    if not frames:
        print(f"No frames found in {input_path}", file=sys.stderr)
        return 1

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.exists():
        output_path.unlink()

    writer = iio.get_writer(
        output_path,
        format="FFMPEG",
        fps=fps,
        codec="libx264",
        pixelformat="yuv420p",
        macro_block_size=1,
    )

    for frame in reversed(frames):
        writer.append_data(frame)

    writer.close()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
