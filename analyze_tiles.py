#!/usr/bin/env python3
"""Analyze tile PNGs to extract 7-segment display data.

Samples pixel colors at known segment positions and classifies each
segment as B (black/on), G (green/tile body), or H (hole/transparent).

Segment layout:
   aaa
  f   b
  f   b
   ggg
  e   c
  e   c
   ddd
"""
from pathlib import Path
from collections import Counter
from PIL import Image

IMAGES_DIR = Path('images')
TILE_COUNT = 6

# Relative (x_frac, y_frac) sample points for each segment
# Adjusted for tile images where the 7-seg character fills most of the frame
SEGMENT_SAMPLES = {
    'a': [(0.35, 0.10), (0.50, 0.10), (0.65, 0.10)],
    'b': [(0.80, 0.22), (0.80, 0.30), (0.80, 0.38)],
    'c': [(0.80, 0.62), (0.80, 0.70), (0.80, 0.78)],
    'd': [(0.35, 0.90), (0.50, 0.90), (0.65, 0.90)],
    'e': [(0.20, 0.62), (0.20, 0.70), (0.20, 0.78)],
    'f': [(0.20, 0.22), (0.20, 0.30), (0.20, 0.38)],
    'g': [(0.35, 0.50), (0.50, 0.50), (0.65, 0.50)],
}

RADIUS = 6  # pixel sampling radius around each point


def classify_pixel(r, g, b, a):
    if a < 128:
        return 'H'
    # Olive-green tile body: green channel dominant over blue
    if g > 55 and g >= r * 0.85 and g > b * 1.3:
        return 'G'
    brightness = (r + g + b) / 3.0
    if brightness < 100:
        return 'B'
    # Grey / silver remnants
    max_c = max(r, g, b)
    min_c = min(r, g, b)
    if (max_c - min_c) < 40 and brightness > 100:
        return 'H'
    return 'G'


def sample_segment(img, positions):
    w, h = img.size
    votes = []
    for fx, fy in positions:
        cx = int(fx * w)
        cy = int(fy * h)
        for dx in range(-RADIUS, RADIUS + 1):
            for dy in range(-RADIUS, RADIUS + 1):
                x = max(0, min(cx + dx, w - 1))
                y = max(0, min(cy + dy, h - 1))
                pixel = img.getpixel((x, y))
                r, g, b, a = pixel if len(pixel) == 4 else (*pixel, 255)
                votes.append(classify_pixel(r, g, b, a))
    c = Counter(votes)
    return c.most_common(1)[0][0]


def analyze_tile(path, debug=False):
    img = Image.open(path).convert('RGBA')
    w, h = img.size
    result = []
    for s in ['a','b','c','d','e','f','g']:
        state = sample_segment(img, SEGMENT_SAMPLES[s])
        if debug:
            # Print center pixel of first sample point
            fx, fy = SEGMENT_SAMPLES[s][0]
            cx, cy = int(fx * w), int(fy * h)
            px = img.getpixel((cx, cy))
            print(f"  {s}: {state}  pixel@({cx},{cy})={px}")
        result.append(state)
    return result


def main():
    print('// Auto-generated tile segment data')
    print('// [a, b, c, d, e, f, g]')
    print('// B=black(segment on), G=green(tile body), H=hole(transparent)')
    print('const TILE_SEGMENT_DATA = [')
    for i in range(1, TILE_COUNT + 1):
        fp = IMAGES_DIR / f'{i}.png'
        bp = IMAGES_DIR / f'{i}b.png'
        front = analyze_tile(fp, debug=True) if fp.exists() else ['G'] * 7
        back = analyze_tile(bp, debug=True) if bp.exists() else ['G'] * 7
        print(f"  {{ front: {front}, back: {back} }}, // Tile {i}")
    print('];')


if __name__ == '__main__':
    main()
