# SkyCast — Weather Forecast Web Application

**Prodigy Infotech Internship – Task 5**  
**GitHub Repository:** `PRODIGY_WD_05`

SkyCast is a responsive, real-time weather forecast web application built with **HTML5**, **CSS3**, and **Vanilla JavaScript**. It fetches live meteorological data from the **Open-Meteo Weather API** and **Open-Meteo Geocoding API** with zero frameworks, no backend, and no API key requirement.

---

## Features

- **City Search & Suggestions:** Search Indian and international cities using the Open-Meteo Geocoding API with matching city, state/region, and country suggestions, plus keyboard navigation (`ArrowUp`, `ArrowDown`, `Enter`, `Escape`).
- **Browser Geolocation:** "Use My Location" button requests permission via `navigator.geolocation` only on explicit user action, reverse-geocodes coordinates when available, and gracefully handles denied, unavailable, or timeout errors.
- **Current Weather Overview:** Displays real-time temperature, feels-like temperature, today's high/low range, weather condition, day/night badge, location name, region/country, coordinates, and live local date/time in the destination's timezone.
- **Atmospheric Detail Cards:** Dedicated glassmorphic cards for Relative Humidity (`%`), Wind Speed (`km/h`), Wind Direction (compass bearing + rotating directional indicator), Precipitation (`mm`), Cloud Cover (`%`), Atmospheric Pressure (`hPa`), and Sunrise/Sunset times.
- **24-Hour Horizontal Forecast:** Scrollable hourly timeline showing local time, day/night-aware weather icons, temperature, and precipitation probability (`%`).
- **7-Day Weekly Forecast:** Daily outlook with weekday/date, weather icon, condition description, precipitation probability (`%`), minimum/maximum temperatures, and a relative temperature range bar.
- **Instant °C / °F Conversion:** Converts all displayed temperatures locally without making redundant API calls.
- **Recent Locations & Refresh:** Saves recent searches in `localStorage` for quick switching and includes a manual Refresh button for up-to-date readings.
- **Dynamic Atmospheric Themes & Accessibility:** Adapts background gradients to current weather and day/night state, supports `prefers-reduced-motion`, high contrast / forced-colors mode, semantic landmarks, and screen reader live announcements.

---

## Technologies Used

- **HTML5** (Semantic landmarks, `<search>`, `<progress>`, accessible ARIA combobox & live regions)
- **CSS3** (Cascade layers `@layer`, CSS custom properties, glassmorphism, CSS Grid & Flexbox, responsive layouts, `prefers-reduced-motion`)
- **Vanilla JavaScript (ES6+)** (`fetch`, `async/await`, `URLSearchParams`, `AbortController`, `Intl.DateTimeFormat`, `localStorage`, Geolocation API)

---

## Weather API Details

All weather and location data is fetched directly from **Open-Meteo** (no API key required):

1. **Open-Meteo Geocoding API**
   - Endpoint: `https://geocoding-api.open-meteo.com/v1/search`
   - Parameters: `name`, `count=5`, `language=en`, `format=json`
2. **Open-Meteo Forecast API**
   - Endpoint: `https://api.open-meteo.com/v1/forecast`
   - Current variables: `temperature_2m`, `relative_humidity_2m`, `apparent_temperature`, `is_day`, `precipitation`, `weather_code`, `cloud_cover`, `pressure_msl`, `wind_speed_10m`, `wind_direction_10m`
   - Hourly variables: `temperature_2m`, `relative_humidity_2m`, `precipitation_probability`, `weather_code`, `wind_speed_10m`
   - Daily variables: `weather_code`, `temperature_2m_max`, `temperature_2m_min`, `precipitation_probability_max`, `sunrise`, `sunset`
   - Query options: `temperature_unit=celsius`, `wind_speed_unit=kmh`, `timezone=auto`, `forecast_days=7`

---

## Project Structure

```text
PRODIGY_WD_05/
├── index.html   # Semantic HTML5 markup and dashboard structure
├── style.css    # Responsive dark navy glassmorphic theme and animations
├── script.js    # Open-Meteo API integration, state management, and DOM rendering
└── README.md    # Project documentation
```

---

## How to Run Locally Using VS Code Live Server

1. Clone or download the `PRODIGY_WD_05` repository folder.
2. Open the project folder in **Visual Studio Code**.
3. Install the **Live Server** extension (`ritwickdey.LiveServer`) from the VS Code Extensions marketplace if not already installed.
4. Open `index.html` and click **Go Live** in the bottom-right status bar (or right-click `index.html` and select **Open with Live Server**).
5. Your browser will open the app at `http://127.0.0.1:5500/` (or the configured port).

> **Note:** The app also works out of the box when deployed to **GitHub Pages** over HTTPS.

---

## How to Allow Browser Location Permission

The **Use My Location** button uses the browser Geolocation API (`navigator.geolocation`), which requires a secure context (`https://` or `http://localhost` / `http://127.0.0.1` via Live Server):

1. Click **Use My Location** in the top bar or landing screen.
2. When prompted by your browser, select **Allow** to share your location.
3. If you previously blocked location access:
   - **Chrome / Edge:** Click the **tune / lock icon** next to the URL in the address bar → set **Location** to **Allow** → reload or click **Use My Location** again.
   - **Firefox:** Click the **shield / lock icon** in the address bar → remove the blocked **Location** permission → click **Use My Location** again.
   - **Safari:** Open **Settings / Preferences → Websites → Location** and allow access for the site.

---

## Attribution

- Weather and geocoding data provided by **[Open-Meteo](https://open-meteo.com/)** — [Open-Meteo Weather API Documentation](https://open-meteo.com/en/docs).
- Optional client-side reverse geocoding for GPS coordinates powered by [BigDataCloud](https://www.bigdatacloud.com/) free client reverse-geocode endpoint.
