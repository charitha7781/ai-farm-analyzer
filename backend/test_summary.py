
import numpy as np
from summary import compute_stats


def test_compute_stats():

    labels = np.array([
        [0, 0, 1, 0, 0, 0],
        [0, 0, 1, 0, 0, 0],
        [0, 0, 2, 2, 0, 0],
        [0, 0, 0, 2, 0, 0],
        [0, 0, 0, 0, 5, 5],
        [0, 0, 0, 0, 5, 5]
    ])

    result = compute_stats(labels)

    assert result["healthy_pct"] == 75.0
    assert result["slightly_healthy_pct"] == 5.6
    assert result["moderate_pct"] == 8.3
    assert result["high_stress_pct"] == 0.0
    assert result["severe_stress_pct"] == 0.0
    assert result["non_crop_pct"] == 11.1
    assert result["worst_region"] == "centre"


def test_no_stress():

    labels = np.zeros((6, 6), dtype=np.uint8)

    result = compute_stats(labels)

    assert result["worst_region"] == "none"


def test_invalid_labels():

    labels = np.array([[0, 6], [2, 3]])

    try:
        compute_stats(labels)
        assert False
    except ValueError:
        pass
