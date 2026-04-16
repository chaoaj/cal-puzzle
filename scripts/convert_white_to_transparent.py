#!/usr/bin/env python3
"""
Convert white (or near-white) pixels in PNGs to fully transparent alpha.
Backs up originals to images/backup/ before overwriting.
"""
from PIL import Image
import os
import shutil

THRESHOLD = 240  # change to 255 for exact-white only
FILES = ["images/1.png", "images/1b.png"]
BACKUP_DIR = "images/backup"

os.makedirs(BACKUP_DIR, exist_ok=True)

for path in FILES:
    if not os.path.exists(path):
        print(f"Skipping missing: {path}")
        continue
    name = os.path.basename(path)
    backup_path = os.path.join(BACKUP_DIR, name)
    # backup original
    if not os.path.exists(backup_path):
        shutil.copyfile(path, backup_path)
        print(f"Backed up {path} -> {backup_path}")
    else:
        print(f"Backup already exists for {path} -> {backup_path}")

    img = Image.open(path).convert("RGBA")
    pixels = img.load()
    w, h = img.size
    changed = 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r >= THRESHOLD and g >= THRESHOLD and b >= THRESHOLD:
                # set alpha to 0 (fully transparent)
                if a != 0:
                    pixels[x, y] = (r, g, b, 0)
                    changed += 1
    """
    Convert image pixels that are not near the tile colors (green or black)
    to fully transparent alpha. Back up originals to images/backup/ before
    overwriting.

    Keeps pixels that are sufficiently "green" (by HSV hue/sat/value)
    or sufficiently "black" (low value). Everything else becomes fully
    transparent to remove background and non-tile content.
    """
    from PIL import Image
    import os
    import shutil
    import colorsys

    FILES = ["images/1.png", "images/1b.png"]
    BACKUP_DIR = "images/backup"

    # Parameters: tune these if you need looser/stricter color matching
    BLACK_VALUE_THRESHOLD = 0.2    # v <= this => considered black (0..1)
    GREEN_HUE = 1.0 / 3.0          # approx 120deg/360 = 1/3
    GREEN_HUE_TOLERANCE = 0.18     # how far hue may deviate from pure green
    GREEN_SAT_MIN = 0.25           # minimum saturation to be considered green
    GREEN_VAL_MIN = 0.15           # minimum value to be considered green

    os.makedirs(BACKUP_DIR, exist_ok=True)

    def is_black(r, g, b):
        # r,g,b are 0..255
        vr = max(r, g, b) / 255.0
        return vr <= BLACK_VALUE_THRESHOLD

    def is_green(r, g, b):
        # convert to HSV
        rn, gn, bn = r / 255.0, g / 255.0, b / 255.0
        h, s, v = colorsys.rgb_to_hsv(rn, gn, bn)
        # account for hue wrapping
        dh = abs(h - GREEN_HUE)
        dh = min(dh, 1 - dh)
        return (dh <= GREEN_HUE_TOLERANCE) and (s >= GREEN_SAT_MIN) and (v >= GREEN_VAL_MIN)

    for path in FILES:
        if not os.path.exists(path):
            print(f"Skipping missing: {path}")
            continue
        name = os.path.basename(path)
        backup_path = os.path.join(BACKUP_DIR, name)
        # backup original
        if not os.path.exists(backup_path):
            shutil.copyfile(path, backup_path)
            print(f"Backed up {path} -> {backup_path}")
        else:
            print(f"Backup already exists for {path} -> {backup_path}")

        img = Image.open(path).convert("RGBA")
        pixels = img.load()
        w, h = img.size
        changed = 0
        for y in range(h):
            for x in range(w):
                r, g, b, a = pixels[x, y]
                # keep if black or green-ish; else make fully transparent
                if is_black(r, g, b) or is_green(r, g, b):
                    continue
                if a != 0:
                    pixels[x, y] = (r, g, b, 0)
                    changed += 1
        img.save(path)
        print(f"Processed {path}: made {changed} pixels transparent")

    print("Done.")
