from PIL import Image
from argparse import ArgumentParser

parser = ArgumentParser()
parser.add_argument("-i", "--input", required = True, help = "target image to process")
parser.add_argument("-o", "--output", required = True, help = "where to save the dot matrix SVG")
parser.add_argument("-r", "--radius", type = int, default = 2, help = "radius of each dot")
parser.add_argument("-t", "--threshold", type = int, default = 4, help = "make a dot if the RGB sum is higher than this")
args = parser.parse_args()

arg_radius: int = args.radius
arg_input: str = args.input
arg_threshold: int = args.threshold
arg_output: str = args.output

img = Image.open(arg_input)

dm_width = arg_radius * 2 * img.width
dm_height = arg_radius * 2 * img.height

svg = f'<svg width="{dm_width}" height="{dm_height}" viewBox="0 0 {dm_width} {dm_height}" fill="none" xmlns="http://www.w3.org/2000/svg">'
# <circle cx="118" cy="50" r="2" fill="white"/>

for x in range(img.width):
    for y in range(img.height):
        color = img.getpixel((x, y))
        assert type(color) is tuple

        if sum(color) < arg_threshold:
            continue
        
        svg += "\n"
        svg += f'<circle cx="{(x + 1) * (arg_radius * 2)}" cy="{(y + 1) * (arg_radius * 2)}" r="{arg_radius}" fill="white"/>'

svg += "\n"
svg += "</svg>"

open(arg_output, "w").write(svg)
print("[.] file written successfully!")
