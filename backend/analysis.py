
import numpy as np
import cv2


def analyze(
    image_bgr: np.ndarray,
    tile: int = 32,
    stressed_below: float = 0.05,
    healthy_above: float = 0.15,
    soil_below: float = -0.10
) -> np.ndarray:

    if image_bgr is None or image_bgr.size == 0:
        raise ValueError("Invalid input image")

    if image_bgr.ndim != 3 or image_bgr.shape[2] != 3:
        raise ValueError("Expected a 3-channel BGR image")

    if tile <= 0:
        raise ValueError("Tile size must be positive")

    if not soil_below <= stressed_below <= healthy_above:
        raise ValueError("Invalid threshold values")

    # Crop leftover edge pixels
    h, w = image_bgr.shape[:2]
    h = (h // tile) * tile
    w = (w // tile) * tile

    if h == 0 or w == 0:
        raise ValueError("Image is smaller than one tile")

    image = image_bgr[:h, :w]
    image_float = image.astype(np.float32)

    B, G, R = cv2.split(image_float)

    # 1. COLOUR: VARI, ExG and HSV hue
    vari = (G - R) / (G + R - B + 1e-6)
    exg = 2 * G - R - B

    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    hue = hsv[:, :, 0]

    # Green vegetation mask
    green_mask = (
        (exg > 15) &
        (vari > 0) &
        (hue >= 25) &
        (hue <= 100)
    ).astype(np.uint8)

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    rows = h // tile
    cols = w // tile

    vari_scores = np.zeros((rows, cols))
    canopy_scores = np.zeros((rows, cols))
    texture_scores = np.zeros((rows, cols))
    shape_scores = np.zeros((rows, cols))
    colour_scores = np.zeros((rows, cols))

    labels = np.zeros((rows, cols), dtype=np.int32)

    # Calculate visual features for every tile
    for i in range(rows):
        for j in range(cols):

            y1, y2 = i * tile, (i + 1) * tile
            x1, x2 = j * tile, (j + 1) * tile

            tile_vari = vari[y1:y2, x1:x2]
            tile_exg = exg[y1:y2, x1:x2]
            tile_hue = hue[y1:y2, x1:x2]
            tile_gray = gray[y1:y2, x1:x2]
            tile_green = green_mask[y1:y2, x1:x2]

            # 1. Colour features
            vari_scores[i, j] = np.mean(tile_vari)

            green_hue_ratio = np.mean(
                (tile_hue >= 25) & (tile_hue <= 100)
            )

            colour_scores[i, j] = (
                np.mean(tile_exg) + green_hue_ratio
            ) / 2

            # 2. Texture: intensity variation
            texture_scores[i, j] = np.std(tile_gray)

            # 3. Canopy cover: percentage of green pixels
            canopy_scores[i, j] = np.mean(tile_green)

            # 4. Shape: connected vegetation contours
            contours, _ = cv2.findContours(
                tile_green,
                cv2.RETR_EXTERNAL,
                cv2.CHAIN_APPROX_SIMPLE
            )

            irregularity = []

            for contour in contours:
                area = cv2.contourArea(contour)

                if area < 3:
                    continue

                perimeter = cv2.arcLength(contour, True)
                hull = cv2.convexHull(contour)
                hull_area = cv2.contourArea(hull)

                circularity = (
                    4 * np.pi * area / (perimeter ** 2 + 1e-6)
                )

                solidity = area / (hull_area + 1e-6)

                x, y, cw, ch = cv2.boundingRect(contour)
                aspect_ratio = max(cw, ch) / (min(cw, ch) + 1e-6)

                irregularity.append(
                    (1 - circularity) + (1 - solidity)
                    + min(aspect_ratio / 5, 1)
                )

            if irregularity:
                shape_scores[i, j] = np.mean(irregularity)

    # 5. Pattern across the field
    # Detect neighbouring tiles with low vegetation VARI
    stressed_mask = vari_scores < healthy_above

    pattern_scores = np.zeros((rows, cols))

    for i in range(rows):
        for j in range(cols):

            neighbours = stressed_mask[
                max(0, i - 1):min(rows, i + 2),
                max(0, j - 1):min(cols, j + 2)
            ]

            pattern_scores[i, j] = np.mean(neighbours)

    # 6. Row uniformity
    # Compare canopy cover across tiles in each row
    row_variation = np.std(canopy_scores, axis=1)

    # Classify each tile
    for i in range(rows):
        for j in range(cols):

            score = vari_scores[i, j]

            # Non-crop classification
            if score < soil_below:
                labels[i, j] = 3
                continue

            if score >= healthy_above:
                label = 0
            elif score >= stressed_below:
                label = 1
            else:
                label = 2

            # Additional visual stress clues
            stress_signals = 0

            # Colour
            if colour_scores[i, j] < 5:
                stress_signals += 1

            # Texture
            if texture_scores[i, j] > 45:
                stress_signals += 1

            # Canopy cover
            if canopy_scores[i, j] < 0.30:
                stress_signals += 1

            # Shape irregularity
            if shape_scores[i, j] > 1.0:
                stress_signals += 1

            # Field pattern
            if pattern_scores[i, j] > 0.60:
                stress_signals += 1

            # Row uniformity
            if row_variation[i] > 0.20:
                stress_signals += 1

            # Combine visual clues with VARI result
            if label == 0 and stress_signals >= 3:
                label = 1

            elif label == 1 and stress_signals >= 4:
                label = 2

            labels[i, j] = label

    return labels
