#!/usr/bin/env python3
from PIL import Image
import os

SRC = 'back-words.jpg'
OUT_DIR = 'images'

def main():
    if not os.path.exists(SRC):
        print('Source image not found:', SRC)
        return
    os.makedirs(OUT_DIR, exist_ok=True)
    img = Image.open(SRC)
    w, h = img.size
    cols = 3
    rows = 2
    cw = w // cols
    ch = h // rows
    count = 1
    for r in range(rows):
        for c in range(cols):
            left = c * cw
            upper = r * ch
            right = (c + 1) * cw if c < cols - 1 else w
            lower = (r + 1) * ch if r < rows - 1 else h
            box = (left, upper, right, lower)
            crop = img.crop(box)
            out_path = os.path.join(OUT_DIR, f'back{count}.jpg')
            crop.save(out_path, quality=95)
            print('Saved', out_path)
            count += 1

if __name__ == '__main__':
    main()
