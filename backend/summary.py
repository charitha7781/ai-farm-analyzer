
import numpy as np


def compute_stats(labels):

    if labels.size == 0:
        raise ValueError("Labels cannot be empty")

    if labels.ndim != 2:
        raise ValueError("Labels must be a 2D array")

    if not np.isin(labels, [0, 1, 2, 3, 4, 5]).all():
        raise ValueError("Labels must be between 0 and 5")

    total = labels.size

    healthy = np.sum(labels == 0)
    slightly_healthy = np.sum(labels == 1)
    moderate = np.sum(labels == 2)
    high_stress = np.sum(labels == 3)
    severe_stress = np.sum(labels == 4)
    non_crop = np.sum(labels == 5)

    stressed = moderate + high_stress + severe_stress

    worst_region = "none"

    if stressed / total * 100 >= 5:

        rows, cols = labels.shape

        row_parts = np.array_split(np.arange(rows), 3)
        col_parts = np.array_split(np.arange(cols), 3)

        zone_names = [
            ["north-west", "north", "north-east"],
            ["west", "centre", "east"],
            ["south-west", "south", "south-east"]
        ]

        worst_score = -1

        for i in range(3):
            for j in range(3):

                zone = labels[np.ix_(row_parts[i], col_parts[j])]

                if zone.size == 0:
                    continue

                score = np.sum(
                    np.isin(zone, [2, 3, 4])
                ) / zone.size

                if score > worst_score:
                    worst_score = score
                    worst_region = zone_names[i][j]

    # Calculate overall farm health score
    health_score = round(
        (healthy + slightly_healthy * 0.75 +
         moderate * 0.5 + high_stress * 0.25) / total * 100
    )

    return {
        "healthy_pct": round(healthy / total * 100, 1),
        "slightly_healthy_pct": round(slightly_healthy / total * 100, 1),
        "moderate_pct": round(moderate / total * 100, 1),
        "high_stress_pct": round(high_stress / total * 100, 1),
        "severe_stress_pct": round(severe_stress / total * 100, 1),
        "non_crop_pct": round(non_crop / total * 100, 1),
        "health_score": health_score,
        "worst_region": worst_region
    }
