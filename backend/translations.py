
TRANSLATIONS = {
    "en": {
        "dashboard": "Farm Dashboard",
        "healthy": "Healthy",
        "slightly_healthy": "Slightly Healthy",
        "moderate": "Moderate Stress",
        "high": "High Stress",
        "severe": "Severe Stress",
        "non_crop": "Non-Crop Area",
        "worst_region": "Worst Affected Region",
        "health_score": "Farm Health Score",
        "total_area": "Total Farm Area",
        "healthy_area": "Healthy Area",
        "stressed_area": "Stressed Area",
        "upload": "Upload Drone Image",
        "analyze": "Analyze Farm",
        "download": "Download Health Map",
        "report": "Farm Health Report",
        "recommendations": "Recommendations",
        "no_stress": "No significant crop stress detected",
        "north": "North",
        "south": "South",
        "east": "East",
        "west": "West",
        "centre": "Centre"
    },

    "kn": {
        "dashboard": "ಕೃಷಿ ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
        "healthy": "ಆರೋಗ್ಯಕರ",
        "slightly_healthy": "ಸ್ವಲ್ಪ ಆರೋಗ್ಯಕರ",
        "moderate": "ಮಧ್ಯಮ ಒತ್ತಡ",
        "high": "ಹೆಚ್ಚಿನ ಒತ್ತಡ",
        "severe": "ತೀವ್ರ ಒತ್ತಡ",
        "non_crop": "ಬೆಳೆ ಇಲ್ಲದ ಪ್ರದೇಶ",
        "worst_region": "ಹೆಚ್ಚು ಹಾನಿಗೊಳಗಾದ ಪ್ರದೇಶ",
        "health_score": "ಬೆಳೆ ಆರೋಗ್ಯದ ಅಂಕ",
        "total_area": "ಒಟ್ಟು ಕೃಷಿ ಪ್ರದೇಶ",
        "healthy_area": "ಆರೋಗ್ಯಕರ ಪ್ರದೇಶ",
        "stressed_area": "ಒತ್ತಡಕ್ಕೊಳಗಾದ ಪ್ರದೇಶ",
        "upload": "ಡ್ರೋನ್ ಚಿತ್ರವನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಿ",
        "analyze": "ಹೊಲವನ್ನು ವಿಶ್ಲೇಷಿಸಿ",
        "download": "ಆರೋಗ್ಯ ನಕ್ಷೆಯನ್ನು ಡೌನ್‌ಲೋಡ್ ಮಾಡಿ",
        "report": "ಬೆಳೆ ಆರೋಗ್ಯ ವರದಿ",
        "recommendations": "ಶಿಫಾರಸುಗಳು",
        "no_stress": "ಗಮನಾರ್ಹ ಬೆಳೆ ಒತ್ತಡ ಕಂಡುಬಂದಿಲ್ಲ",
        "north": "ಉತ್ತರ",
        "south": "ದಕ್ಷಿಣ",
        "east": "ಪೂರ್ವ",
        "west": "ಪಶ್ಚಿಮ",
        "centre": "ಮಧ್ಯಭಾಗ"
    }
}


def get_translations(language="en"):
    if language not in TRANSLATIONS:
        language = "en"

    return TRANSLATIONS[language]


def translate(key, language="en"):
    translations = get_translations(language)
    return translations.get(key, key)
