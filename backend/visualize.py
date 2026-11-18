
import cv2
import numpy as np
import base64


# Crop health colours (BGR format)
COLORS = {
    0: (0, 200, 0),        # Healthy - Green
    1: (150, 240, 100),    # Slightly healthy - Light green
    2: (0, 220, 255),      # Moderate stress - Yellow
    3: (0, 140, 255),      # High stress - Orange
    4: (0, 0, 230),        # Severe stress - Red
    5: (128, 128, 128)     # Non-crop - Grey
}


def make_overlay(image_bgr, labels, tile=32, alpha=0.45,
                 show_grid=True):

    if image_bgr is None or image_bgr.size == 0:
        raise ValueError("Invalid input image")

    if labels is None or labels.size == 0:
        raise ValueError("Labels cannot be empty")

    if not 0 <= alpha <= 1:
        raise ValueError("Alpha must be between 0 and 1")

    if not np.isin(labels, list(COLORS.keys())).all():
        raise ValueError("Labels must be between 0 and 5")

    height, width = image_bgr.shape[:2]

    # Create colour map
    color_map = np.zeros(
        (labels.shape[0], labels.shape[1], 3),
        dtype=np.uint8
    )

    for label, color in COLORS.items():
        color_map[labels == label] = color

    # Expand labels to original image size
    overlay = cv2.resize(
        color_map,
        (width, height),
        interpolation=cv2.INTER_NEAREST
    )

    # Blend original image and colour map
    result = cv2.addWeighted(
        image_bgr, 1 - alpha,
        overlay, alpha, 0
    )

    # Add thin grid lines
    if show_grid:
        rows, cols = labels.shape

        for i in range(1, rows):
            y = round(i * height / rows)
            cv2.line(result, (0, y), (width, y),
                     (255, 255, 255), 1)

        for j in range(1, cols):
            x = round(j * width / cols)
            cv2.line(result, (x, 0), (x, height),
                     (255, 255, 255), 1)

    return result


def to_base64_png(image_bgr):

    success, buffer = cv2.imencode(".png", image_bgr)

    if not success:
        raise ValueError("Image encoding failed")

    return base64.b64encode(buffer).decode("utf-8")


def get_color_legend():

    return {
        "Healthy": COLORS[0],
        "Slightly Healthy": COLORS[1],
        "Moderate Stress": COLORS[2],
        "High Stress": COLORS[3],
        "Severe Stress": COLORS[4],
        "Non-Crop": COLORS[5]
    }
