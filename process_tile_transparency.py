#!/usr/bin/env python3
from pathlib import Path
from PIL import Image


IMAGES_DIR = Path('images')
TILE_COUNT = 6


def is_silver_grey(red: int, green: int, blue: int) -> bool:
    max_channel = max(red, green, blue)
    min_channel = min(red, green, blue)
    channel_spread = max_channel - min_channel
    brightness = (red + green + blue) / 3
    return channel_spread <= 35 and 75 <= brightness <= 235


def process_image(source_path: Path, output_path: Path) -> None:
    image = Image.open(source_path).convert('RGBA')
    pixels = image.load()
    width, height = image.size

    for y in range(height):
        for x in range(width):
            red, green, blue, alpha = pixels[x, y]
            if alpha == 0:
                continue
            if is_silver_grey(red, green, blue):
                pixels[x, y] = (red, green, blue, 0)

    image.save(output_path)
    print(f'Built {output_path} from {source_path}')


def main() -> None:
    for index in range(1, TILE_COUNT + 1):
        front_source = IMAGES_DIR / f'front{index}.jpg'
        back_source = IMAGES_DIR / f'back{index}.jpg'
        front_output = IMAGES_DIR / f'{index}.png'
        back_output = IMAGES_DIR / f'{index}b.png'

        if front_source.exists():
            process_image(front_source, front_output)
        else:
            print(f'Missing source {front_source}')

        if back_source.exists():
            process_image(back_source, back_output)
        else:
            print(f'Missing source {back_source}')


if __name__ == '__main__':
    main()
