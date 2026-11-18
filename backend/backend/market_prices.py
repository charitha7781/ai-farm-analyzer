
import os
import requests


API_URL = (
    "https://api.data.gov.in/resource/"
    "9ef84268-d588-465a-a308-a864a43d0070"
)


def fetch_crop_prices(
    state="Karnataka",
    district=None,
    commodity=None,
    market=None,
    limit=100
):
    api_key = os.getenv("DATA_GOV_IN_API_KEY")

    if not api_key:
        raise ValueError("Data.gov.in API key is missing")

    params = {
        "api-key": api_key,
        "format": "json",
        "limit": limit
    }

    if state:
        params["filters[state]"] = state

    if district:
        params["filters[district]"] = district

    if commodity:
        params["filters[commodity]"] = commodity

    if market:
        params["filters[market]"] = market

    try:
        response = requests.get(
            API_URL,
            params=params,
            timeout=20
        )

        response.raise_for_status()
        data = response.json()

    except requests.RequestException as error:
        raise RuntimeError(
            f"Unable to fetch crop prices: {error}"
        )

    records = data.get("records", [])

    prices = []

    for item in records:
        prices.append({
            "state": item.get("state"),
            "district": item.get("district"),
            "market": item.get("market"),
            "crop": item.get("commodity"),
            "variety": item.get("variety"),
            "minimum_price": item.get("min_price"),
            "maximum_price": item.get("max_price"),
            "modal_price": item.get("modal_price"),
            "date": item.get("arrival_date")
        })

    return prices


if __name__ == "__main__":

    result = fetch_crop_prices(
        state="Karnataka",
        commodity="Tomato"
    )

    for crop in result:
        print(crop)
