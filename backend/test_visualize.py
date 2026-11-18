
import numpy as np
from visualize import make_overlay, to_base64_png
import base64


def test_make_overlay():
    image = np.zeros((64, 64, 3), dtype=np.uint8)

    labels = np.array([
        [0, 1],
        [4, 5]
    ])

    result = make_overlay(image, labels)

    assert result.shape == image.shape
    assert result.dtype == np.uint8


def test_base64_png():
    image = np.zeros((64, 64, 3), dtype=np.uint8)

    encoded = to_base64_png(image)

    assert isinstance(encoded, str)
    assert len(encoded) > 0

    decoded = base64.b64decode(encoded)
    assert decoded.startswith(b"\x89PNG")


def test_invalid_labels():
    image = np.zeros((64, 64, 3), dtype=np.uint8)
    labels = np.array([[0, 6], [2, 3]])

    try:
        make_overlay(image, labels)
        assert False
    except ValueError:
        pass
