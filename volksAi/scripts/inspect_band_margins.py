from PIL import Image
import numpy as np

img = Image.open("assets/header_band.png")
arr = np.array(img.convert("L"))
print(f"Header band size: {img.size}")

# Check columns 0 to 150 (left margin area)
left_area = arr[:, :150]
print(f"Left area min: {left_area.min()}, max: {left_area.max()}")
# Find rows where left area is not white (< 250)
non_white_in_left = np.where(left_area.min(axis=1) < 250)[0]
print(f"Rows with non-white in first 150 px: {non_white_in_left}")
for r in non_white_in_left:
    print(f"  Row {r}: min={left_area[r].min()}")

# Check right area: 2330 to end (2482)
right_area = arr[:, 2330:]
non_white_in_right = np.where(right_area.min(axis=1) < 250)[0]
print(f"Rows with non-white in right area (x > 2330): {non_white_in_right}")
for r in non_white_in_right:
    print(f"  Row {r}: min={right_area[r].min()}")
