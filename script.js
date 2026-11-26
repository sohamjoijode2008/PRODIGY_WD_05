'use strict';

const GEOCODING_API_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_API_URL = 'https://api.open-meteo.com/v1/forecast';
const REVERSE_GEOCODE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';
const RECENT_STORAGE_KEY = 'skycast_recent_locations_v1';
const MAX_RECENT_LOCATIONS = 6;
const REQUEST_TIMEOUT_MS = 12000;

/**
 * WMO Weather interpretation codes mapped to human-readable conditions,
 * icon keys, and atmospheric theme palettes.
 */
const WMO_WEATHER_MAP = {
  0: { label: 'Clear sky', icon: 'clear', themeDay: 'clear-day', themeNight: 'clear-night' },
  1: { label: 'Mainly clear', icon: 'mainly-clear', themeDay: 'clear-day', themeNight: 'clear-night' },
  2: { label: 'Partly cloudy', icon: 'partly-cloudy', themeDay: 'cloudy', themeNight: 'clear-night' },
  3: { label: 'Overcast', icon: 'overcast', themeDay: 'cloudy', themeNight: 'cloudy' },
  45: { label: 'Fog', icon: 'fog', themeDay: 'fog', themeNight: 'fog' },
  48: { label: 'Depositing rime fog', icon: 'fog', themeDay: 'fog', themeNight: 'fog' },
  51: { label: 'Light drizzle', icon: 'drizzle', themeDay: 'rain', themeNight: 'rain' },
  53: { label: 'Moderate drizzle', icon: 'drizzle', themeDay: 'rain', themeNight: 'rain' },
  55: { label: 'Dense drizzle', icon: 'drizzle', themeDay: 'rain', themeNight: 'rain' },
  56: { label: 'Light freezing drizzle', icon: 'freezing-rain', themeDay: 'snow', themeNight: 'snow' },
  57: { label: 'Dense freezing drizzle', icon: 'freezing-rain', themeDay: 'snow', themeNight: 'snow' },
  61: { label: 'Slight rain', icon: 'rain', themeDay: 'rain', themeNight: 'rain' },
  63: { label: 'Moderate rain', icon: 'rain', themeDay: 'rain', themeNight: 'rain' },
  65: { label: 'Heavy rain', icon: 'rain', themeDay: 'rain', themeNight: 'rain' },
  66: { label: 'Light freezing rain', icon: 'freezing-rain', themeDay: 'snow', themeNight: 'snow' },
  67: { label: 'Heavy freezing rain', icon: 'freezing-rain', themeDay: 'snow', themeNight: 'snow' },
  71: { label: 'Slight snowfall', icon: 'snow', themeDay: 'snow', themeNight: 'snow' },
  73: { label: 'Moderate snowfall', icon: 'snow', themeDay: 'snow', themeNight: 'snow' },
  75: { label: 'Heavy snowfall', icon: 'snow', themeDay: 'snow', themeNight: 'snow' },
  77: { label: 'Snow grains', icon: 'snow', themeDay: 'snow', themeNight: 'snow' },
  80: { label: 'Slight rain showers', icon: 'rain-showers', themeDay: 'rain', themeNight: 'rain' },
  81: { label: 'Moderate rain showers', icon: 'rain-showers', themeDay: 'rain', themeNight: 'rain' },
  82: { label: 'Violent rain showers', icon: 'rain-showers', themeDay: 'storm', themeNight: 'storm' },
  85: { label: 'Slight snow showers', icon: 'snow-showers', themeDay: 'snow', themeNight: 'snow' },
  86: { label: 'Heavy snow showers', icon: 'snow-showers', themeDay: 'snow', themeNight: 'snow' },
  95: { label: 'Thunderstorm', icon: 'thunderstorm', themeDay: 'storm', themeNight: 'storm' },
  96: { label: 'Thunderstorm with slight hail', icon: 'thunderstorm', themeDay: 'storm', themeNight: 'storm' },
  99: { label: 'Thunderstorm with heavy hail', icon: 'thunderstorm', themeDay: 'storm', themeNight: 'storm' },
};

const state = {
  unit: 'C',
  currentLocation: null,
  weatherData: null,
  lastFetchedAt: null,
  recentLocations: [],
  suggestions: [],
  highlightedIndex: -1,
  lastSearchQuery: '',
  searchAbortController: null,
  forecastAbortController: null,
  searchRequestId: 0,
  forecastRequestId: 0,
  debounceTimer: null,
  isFetchingForecast: false,
};

const dom = {
  body: document.body,
  searchForm: document.getElementById('search-form'),
  searchContainer: document.querySelector('.search-container'),
  cityInput: document.getElementById('city-input'),
  clearSearchBtn: document.getElementById('clear-search-btn'),
  searchBtn: document.getElementById('search-btn'),
  suggestionsPanel: document.getElementById('suggestions-panel'),
  suggestionsStatus: document.getElementById('suggestions-status'),
  suggestionsList: document.getElementById('suggestions-list'),
  locationBtn: document.getElementById('location-btn'),
  emptyLocationBtn: document.getElementById('empty-location-btn'),
  emptySearchFocusBtn: document.getElementById('empty-search-focus-btn'),
  refreshBtn: document.getElementById('refresh-btn'),
  unitCelsiusBtn: document.getElementById('unit-celsius'),
  unitFahrenheitBtn: document.getElementById('unit-fahrenheit'),
  recentBar: document.getElementById('recent-locations-bar'),
  recentList: document.getElementById('recent-list'),
  clearHistoryBtn: document.getElementById('clear-history-btn'),
  liveAnnouncer: document.getElementById('live-announcer'),
  errorBanner: document.getElementById('error-banner'),
  errorTitle: document.getElementById('error-title'),
  errorMessage: document.getElementById('error-message'),
  dismissErrorBtn: document.getElementById('dismiss-error-btn'),
  loadingState: document.getElementById('loading-state'),
  loadingText: document.getElementById('loading-text'),
  emptyState: document.getElementById('empty-state'),
  dashboard: document.getElementById('weather-dashboard'),
  locationHeading: document.getElementById('location-heading'),
  locationRegion: document.getElementById('location-region'),
  localDatetime: document.getElementById('local-datetime'),
  locationCoords: document.getElementById('location-coords'),
  dayNightBadge: document.getElementById('day-night-badge'),
  dayNightText: document.getElementById('day-night-text'),
  currentWeatherIcon: document.getElementById('current-weather-icon'),
  currentTemp: document.getElementById('current-temp'),
  currentCondition: document.getElementById('current-condition'),
  feelsLikeTemp: document.getElementById('feels-like-temp'),
  todayRange: document.getElementById('today-range'),
  lastUpdated: document.getElementById('last-updated'),
  detailHumidity: document.getElementById('detail-humidity'),
  detailHumidityNote: document.getElementById('detail-humidity-note'),
  detailWindSpeed: document.getElementById('detail-wind-speed'),
  detailWindDir: document.getElementById('detail-wind-dir'),
  detailWindDeg: document.getElementById('detail-wind-deg'),
  windCompassArrow: document.getElementById('wind-compass-arrow'),
  detailPrecipitation: document.getElementById('detail-precipitation'),
  detailCloudCover: document.getElementById('detail-cloud-cover'),
  detailPressure: document.getElementById('detail-pressure'),
  detailSunrise: document.getElementById('detail-sunrise'),
  detailSunset: document.getElementById('detail-sunset'),
  hourlyTimezoneBadge: document.getElementById('hourly-timezone-badge'),
  hourlyList: document.getElementById('hourly-list'),
  dailyList: document.getElementById('daily-list'),
};

let svgUidCounter = 0;

/**
 * Create a composite AbortSignal combining user cancellation and a request timeout.
 */
function createRequestSignal(controller, timeoutMs = REQUEST_TIMEOUT_MS) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs)]);
  }
  const timerId = window.setTimeout(() => {
    controller.abort(new DOMException('Request timed out', 'TimeoutError'));
  }, timeoutMs);
  controller.signal.addEventListener('abort', () => window.clearTimeout(timerId), { once: true });
  return controller.signal;
}

/**
 * Resolve WMO code metadata safely.
 */
function getWeatherMeta(code, isDay = true) {
  const entry = WMO_WEATHER_MAP[code];
  if (!entry) {
    return {
      label: 'Weather condition unavailable',
      icon: 'partly-cloudy',
      theme: isDay ? 'clear-day' : 'clear-night',
    };
  }
  return {
    label: entry.label,
    icon: entry.icon,
    theme: isDay ? entry.themeDay : entry.themeNight,
  };
}

/**
 * Convert Celsius temperature to the currently active unit.
 */
function convertTemp(celsius) {
  if (celsius === null || celsius === undefined || Number.isNaN(Number(celsius))) {
    return null;
  }
  const value = Number(celsius);
  if (state.unit === 'F') {
    return (value * 9) / 5 + 32;
  }
  return value;
}

function formatTemp(celsius) {
  const converted = convertTemp(celsius);
  if (converted === null) {
    return '—';
  }
  return `${Math.round(converted)}°${state.unit}`;
}

function formatTempShort(celsius) {
  const converted = convertTemp(celsius);
  if (converted === null) {
    return '—';
  }
  return `${Math.round(converted)}°`;
}

function formatMetric(value, unit, decimals = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  const num = Number(value);
  const formatted = decimals > 0 ? num.toFixed(decimals) : String(Math.round(num));
  return `${formatted} ${unit}`;
}

function formatCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (Number.isNaN(lat) || Number.isNaN(lon)) return '';
  const latHem = lat >= 0 ? 'N' : 'S';
  const lonHem = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(2)}°${latHem}, ${Math.abs(lon).toFixed(2)}°${lonHem}`;
}

function getCardinalDirection(degrees) {
  if (degrees === null || degrees === undefined || Number.isNaN(Number(degrees))) {
    return '—';
  }
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const normalized = ((Number(degrees) % 360) + 360) % 360;
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

function getHumidityNote(humidity) {
  if (humidity === null || humidity === undefined) return 'Relative humidity';
  if (humidity < 30) return 'Dry air';
  if (humidity <= 60) return 'Comfortable level';
  if (humidity <= 80) return 'Moderately humid';
  return 'Very humid';
}

/**
 * Format an ISO local wall-clock time string ("YYYY-MM-DDTHH:MM") without browser TZ shift.
 */
function formatLocalTimeFromIso(isoStr, includeMinutes = true) {
  if (!isoStr || typeof isoStr !== 'string' || !isoStr.includes('T')) {
    return '—';
  }
  const timePart = isoStr.split('T')[1];
  const [hourStr, minuteStr] = timePart.split(':');
  const hour24 = Number(hourStr);
  const minute = Number(minuteStr ?? 0);
  if (Number.isNaN(hour24) || Number.isNaN(minute)) {
    return '—';
  }
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  if (!includeMinutes) {
    return `${hour12} ${period}`;
  }
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

/**
 * Format the current date and time in the selected location's IANA timezone.
 */
function formatLocationNow(timezone, fallbackIso) {
  if (timezone) {
    try {
      return new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short',
      }).format(new Date());
    } catch {
      // Fall back to Open-Meteo local timestamp string below if timezone is unrecognized.
    }
  }
  if (!fallbackIso) return '—';
  const [datePart] = fallbackIso.split('T');
  return `${formatDateLabel(datePart, -1)} · ${formatLocalTimeFromIso(fallbackIso, true)}`;
}

/**
 * Format a "YYYY-MM-DD" calendar date safely using UTC to avoid local timezone drift.
 */
function formatDateLabel(dateStr, index) {
  if (index === 0) return 'Today';
  if (index === 1) return 'Tomorrow';
  if (!dateStr) return '—';
  const parts = dateStr.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dateStr;
  const utcDate = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(utcDate);
}

/**
 * Determine if a given local hour ISO string ("YYYY-MM-DDTHH:MM") is daytime
 * using the corresponding daily sunrise and sunset strings.
 */
function isHourDaytime(hourIso, dailyData) {
  if (!hourIso || !dailyData?.time || !dailyData.sunrise || !dailyData.sunset) {
    return true;
  }
  const datePart = hourIso.slice(0, 10);
  const dayIndex = dailyData.time.indexOf(datePart);
  if (dayIndex === -1) {
    const hourNum = Number(hourIso.slice(11, 13));
    return hourNum >= 6 && hourNum < 18;
  }
  const sunrise = dailyData.sunrise[dayIndex];
  const sunset = dailyData.sunset[dayIndex];
  if (!sunrise || !sunset) {
    const hourNum = Number(hourIso.slice(11, 13));
    return hourNum >= 6 && hourNum < 18;
  }
  return hourIso >= sunrise && hourIso < sunset;
}

/**
 * Build bespoke SVG weather icons for each WMO condition and day/night state.
 */
function createWeatherSvg(iconKey, isDay) {
  svgUidCounter += 1;
  const uid = svgUidCounter;

  const sunOrb = `
    <defs>
      <radialGradient id="sun-${uid}" cx="0.35" cy="0.3" r="0.7">
        <stop offset="0%" stop-color="#fef08a"/>
        <stop offset="55%" stop-color="#fbbf24"/>
        <stop offset="100%" stop-color="#f59e0b"/>
      </radialGradient>
    </defs>
    <circle cx="32" cy="32" r="14" fill="url(#sun-${uid})"/>
    <g stroke="#fbbf24" stroke-width="2.6" stroke-linecap="round">
      <line x1="32" y1="7" x2="32" y2="12"/>
      <line x1="32" y1="52" x2="32" y2="57"/>
      <line x1="7" y1="32" x2="12" y2="32"/>
      <line x1="52" y1="32" x2="57" y2="32"/>
      <line x1="14.3" y1="14.3" x2="18" y2="18"/>
      <line x1="46" y1="46" x2="49.7" y2="49.7"/>
      <line x1="49.7" y1="14.3" x2="46" y2="18"/>
      <line x1="18" y1="46" x2="14.3" y2="49.7"/>
    </g>
  `;

  const moonCrescent = `
    <defs>
      <linearGradient id="moon-${uid}" x1="16" y1="14" x2="48" y2="50" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#e0e7ff"/>
        <stop offset="100%" stop-color="#818cf8"/>
      </linearGradient>
    </defs>
    <path d="M40.5 44.5A16 16 0 0 1 24.5 18a16 16 0 1 0 21.5 21.5 15.9 15.9 0 0 1-5.5 5Z" fill="url(#moon-${uid})"/>
    <circle cx="45" cy="18" r="1.8" fill="#bae6fd"/>
    <circle cx="51" cy="26" r="1.3" fill="#e0e7ff"/>
  `;

  const cloudShape = (gradId, c1 = '#f1f5f9', c2 = '#94a3b8') => `
    <defs>
      <linearGradient id="${gradId}" x1="16" y1="22" x2="52" y2="50" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="${c1}"/>
        <stop offset="100%" stop-color="${c2}"/>
      </linearGradient>
    </defs>
    <path d="M20 48h26a10 10 0 0 0 1.6-19.87 13.5 13.5 0 0 0-26.07 3.2A8.5 8.5 0 0 0 20 48Z" fill="url(#${gradId})"/>
  `;

  let body = '';
  switch (iconKey) {
    case 'clear':
      body = isDay ? sunOrb : moonCrescent;
      break;
    case 'mainly-clear':
      body = isDay
        ? `
          <defs>
            <radialGradient id="msun-${uid}" cx="0.35" cy="0.3" r="0.7">
              <stop offset="0%" stop-color="#fef08a"/>
              <stop offset="100%" stop-color="#f59e0b"/>
            </radialGradient>
            <linearGradient id="mcloud-${uid}" x1="22" y1="30" x2="52" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#f8fafc"/>
              <stop offset="100%" stop-color="#bae6fd"/>
            </linearGradient>
          </defs>
          <circle cx="24" cy="24" r="11" fill="url(#msun-${uid})"/>
          <g stroke="#fbbf24" stroke-width="2.2" stroke-linecap="round">
            <line x1="24" y1="7" x2="24" y2="10"/>
            <line x1="7" y1="24" x2="10" y2="24"/>
            <line x1="12" y1="12" x2="14.5" y2="14.5"/>
            <line x1="36" y1="12" x2="33.5" y2="14.5"/>
          </g>
          <path d="M24 49h23a8 8 0 0 0 1.2-15.9 10.5 10.5 0 0 0-20.3 2.5A6.8 6.8 0 0 0 24 49Z" fill="url(#mcloud-${uid})"/>
        `
        : `
          <defs>
            <linearGradient id="mmoon-${uid}" x1="14" y1="12" x2="36" y2="38" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#e0e7ff"/>
              <stop offset="100%" stop-color="#818cf8"/>
            </linearGradient>
            <linearGradient id="mncloud-${uid}" x1="22" y1="30" x2="52" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#cbd5e1"/>
              <stop offset="100%" stop-color="#64748b"/>
            </linearGradient>
          </defs>
          <path d="M29 33A11 11 0 0 1 18 15a11 11 0 1 0 15 15 11 11 0 0 1-4 3Z" fill="url(#mmoon-${uid})"/>
          <path d="M24 49h23a8 8 0 0 0 1.2-15.9 10.5 10.5 0 0 0-20.3 2.5A6.8 6.8 0 0 0 24 49Z" fill="url(#mncloud-${uid})"/>
        `;
      break;
    case 'partly-cloudy':
      body = isDay
        ? `
          <defs>
            <radialGradient id="psun-${uid}" cx="0.35" cy="0.3" r="0.7">
              <stop offset="0%" stop-color="#fde68a"/>
              <stop offset="100%" stop-color="#f59e0b"/>
            </radialGradient>
            <linearGradient id="pcloud-${uid}" x1="16" y1="24" x2="52" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#f8fafc"/>
              <stop offset="100%" stop-color="#7dd3fc"/>
            </linearGradient>
          </defs>
          <circle cx="41" cy="22" r="10" fill="url(#psun-${uid})"/>
          <path d="M18 49h27a9.5 9.5 0 0 0 1.5-18.88 12.5 12.5 0 0 0-24.1 3A8 8 0 0 0 18 49Z" fill="url(#pcloud-${uid})"/>
        `
        : `
          <defs>
            <linearGradient id="pmoon-${uid}" x1="34" y1="10" x2="52" y2="30" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#e0e7ff"/>
              <stop offset="100%" stop-color="#818cf8"/>
            </linearGradient>
            <linearGradient id="pncloud-${uid}" x1="16" y1="24" x2="52" y2="50" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="#cbd5e1"/>
              <stop offset="100%" stop-color="#64748b"/>
            </linearGradient>
          </defs>
          <path d="M46 28a10 10 0 0 1-10-16 10 10 0 1 0 13.5 13.5A10 10 0 0 1 46 28Z" fill="url(#pmoon-${uid})"/>
          <path d="M18 49h27a9.5 9.5 0 0 0 1.5-18.88 12.5 12.5 0 0 0-24.1 3A8 8 0 0 0 18 49Z" fill="url(#pncloud-${uid})"/>
        `;
      break;
    case 'overcast':
      body = `
        <defs>
          <linearGradient id="ocloud1-${uid}" x1="22" y1="14" x2="54" y2="38" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#94a3b8"/>
            <stop offset="100%" stop-color="#475569"/>
          </linearGradient>
          <linearGradient id="ocloud2-${uid}" x1="14" y1="24" x2="48" y2="50" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stop-color="#e2e8f0"/>
            <stop offset="100%" stop-color="#64748b"/>
          </linearGradient>
        </defs>
        <path d="M26 38h21a7.5 7.5 0 0 0 1.2-14.9 10 10 0 0 0-19.3 2.4 6.4 6.4 0 0 0-2.9 12.5Z" fill="url(#ocloud1-${uid})"/>
        <path d="M16 50h28a9.5 9.5 0 0 0 1.5-18.88 12.5 12.5 0 0 0-24.1 3A8 8 0 0 0 16 50Z" fill="url(#ocloud2-${uid})"/>
      `;
      break;
    case 'fog':
      body = `
        ${cloudShape(`fogc-${uid}`, '#cbd5e1', '#64748b')}
        <g stroke="#94a3b8" stroke-width="3" stroke-linecap="round">
          <line x1="14" y1="53" x2="50" y2="53"/>
          <line x1="18" y1="59" x2="46" y2="59"/>
        </g>
      `;
      break;
    case 'drizzle':
      body = `
        ${cloudShape(`drzc-${uid}`, '#e0f2fe', '#64748b')}
        <g stroke="#38bdf8" stroke-width="2.5" stroke-linecap="round">
          <line x1="24" y1="52" x2="22" y2="57"/>
          <line x1="34" y1="52" x2="32" y2="57"/>
          <line x1="44" y1="52" x2="42" y2="57"/>
        </g>
      `;
      break;
    case 'rain':
    case 'rain-showers':
      body = `
        ${cloudShape(`rainc-${uid}`, '#e0f2fe', '#475569')}
        <g stroke="#22d3ee" stroke-width="2.8" stroke-linecap="round">
          <line x1="22" y1="51" x2="18" y2="59"/>
          <line x1="32" y1="51" x2="28" y2="59"/>
          <line x1="42" y1="51" x2="38" y2="59"/>
        </g>
      `;
      break;
    case 'freezing-rain':
      body = `
        ${cloudShape(`frzc-${uid}`, '#e0f2fe', '#64748b')}
        <line x1="23" y1="51" x2="20" y2="59" stroke="#38bdf8" stroke-width="2.6" stroke-linecap="round"/>
        <circle cx="32" cy="55" r="2.2" fill="#e0f2fe"/>
        <line x1="43" y1="51" x2="40" y2="59" stroke="#38bdf8" stroke-width="2.6" stroke-linecap="round"/>
      `;
      break;
    case 'snow':
    case 'snow-showers':
      body = `
        ${cloudShape(`snwc-${uid}`, '#f8fafc', '#94a3b8')}
        <g fill="#bae6fd">
          <circle cx="22" cy="54" r="2.6"/>
          <circle cx="32" cy="57" r="2.6"/>
          <circle cx="42" cy="54" r="2.6"/>
        </g>
      `;
      break;
    case 'thunderstorm':
      body = `
        ${cloudShape(`thdc-${uid}`, '#cbd5e1', '#334155')}
        <polygon points="34,42 25,53 31,53 28,62 40,49 33,49" fill="#fbbf24"/>
        <line x1="20" y1="52" x2="17" y2="58" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/>
        <line x1="45" y1="52" x2="42" y2="58" stroke="#38bdf8" stroke-width="2.4" stroke-linecap="round"/>
      `;
      break;
    default:
      body = cloudShape(`defc-${uid}`, '#e2e8f0', '#64748b');
  }

  const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" aria-hidden="true">${body}</svg>`;
  const parsed = new DOMParser().parseFromString(svgMarkup, 'image/svg+xml');
  return parsed.documentElement;
}

function createDropSvg() {
  const svgMarkup = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>`;
  return new DOMParser().parseFromString(svgMarkup, 'image/svg+xml').documentElement;
}

/**
 * Announce important status updates to assistive technology.
 */
function announceStatus(message) {
  dom.liveAnnouncer.textContent = '';
  window.setTimeout(() => {
    dom.liveAnnouncer.textContent = message;
  }, 40);
}

/**
 * Error and loading view state helpers.
 */
function showError(title, message) {
  dom.errorTitle.textContent = title;
  dom.errorMessage.textContent = message;
  dom.errorBanner.hidden = false;
}

function hideError() {
  dom.errorBanner.hidden = true;
}

function setLoading(isLoading, message = 'Fetching live forecast data...') {
  state.isFetchingForecast = isLoading;
  dom.loadingText.textContent = message;
  dom.loadingState.hidden = !isLoading;
  dom.locationBtn.disabled = isLoading;
  if (dom.emptyLocationBtn) {
    dom.emptyLocationBtn.disabled = isLoading;
  }
  dom.refreshBtn.disabled = isLoading || !state.currentLocation;
  dom.refreshBtn.classList.toggle('is-spinning', isLoading);

  if (isLoading) {
    dom.emptyState.hidden = true;
    dom.dashboard.hidden = true;
  }
}

/**
 * Manage Recent Locations in localStorage safely.
 */
function loadRecentLocations() {
  try {
    const raw = window.localStorage.getItem(RECENT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecentLocation(location) {
  const key = `${Number(location.latitude).toFixed(2)},${Number(location.longitude).toFixed(2)}`;
  const normalized = {
    name: location.name,
    region: location.region || '',
    country: location.country || '',
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    key,
  };

  const filtered = state.recentLocations.filter((item) => item.key !== key);
  state.recentLocations = [normalized, ...filtered].slice(0, MAX_RECENT_LOCATIONS);

  try {
    window.localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(state.recentLocations));
  } catch {
    // Ignore storage quota or private mode restrictions.
  }

  renderRecentLocations();
}

function clearRecentLocations() {
  state.recentLocations = [];
  try {
    window.localStorage.removeItem(RECENT_STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
  renderRecentLocations();
}

function renderRecentLocations() {
  if (state.recentLocations.length === 0) {
    dom.recentBar.hidden = true;
    dom.recentList.replaceChildren();
    return;
  }

  const currentKey = state.currentLocation
    ? `${Number(state.currentLocation.latitude).toFixed(2)},${Number(state.currentLocation.longitude).toFixed(2)}`
    : '';

  const nodes = state.recentLocations.map((loc) => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'recent-chip';
    if (loc.key === currentKey) {
      btn.classList.add('is-current');
      btn.setAttribute('aria-current', 'true');
    }
    btn.textContent = loc.country ? `${loc.name}, ${loc.country}` : loc.name;
    btn.addEventListener('click', () => {
      closeSuggestions();
      selectLocation(loc);
    });
    li.appendChild(btn);
    return li;
  });

  dom.recentList.replaceChildren(...nodes);
  dom.recentBar.hidden = false;
}

/**
 * Fetch matching cities from the Open-Meteo Geocoding API.
 */
async function fetchCitySuggestions(query) {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    closeSuggestions();
    return [];
  }

  if (state.searchAbortController) {
    state.searchAbortController.abort();
  }
  const controller = new AbortController();
  state.searchAbortController = controller;
  state.searchRequestId += 1;
  const activeRequestId = state.searchRequestId;

  const params = new URLSearchParams({
    name: trimmed,
    count: '5',
    language: 'en',
    format: 'json',
  });

  try {
    const response = await fetch(`${GEOCODING_API_URL}?${params.toString()}`, {
      signal: createRequestSignal(controller, REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Geocoding service returned HTTP ${response.status}`);
    }

    const data = await response.json();

    // Prevent older search responses from overwriting newer results.
    if (activeRequestId !== state.searchRequestId) {
      return null;
    }

    const results = Array.isArray(data.results) ? data.results : [];
    state.lastSearchQuery = trimmed;
    state.suggestions = results.map((item) => ({
      name: item.name,
      region: item.admin1 || item.admin2 || '',
      country: item.country || item.country_code || '',
      latitude: item.latitude,
      longitude: item.longitude,
    }));
    state.highlightedIndex = -1;

    renderSuggestions(state.suggestions, trimmed);
    return state.suggestions;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null;
    }
    if (activeRequestId !== state.searchRequestId) {
      return null;
    }
    closeSuggestions();
    showError('Location Search Failed', 'Could not reach the Open-Meteo geocoding service. Please check your internet connection and try again.');
    return null;
  }
}

function renderSuggestions(locations, query) {
  dom.suggestionsList.replaceChildren();
  dom.cityInput.removeAttribute('aria-activedescendant');

  if (!locations || locations.length === 0) {
    dom.suggestionsStatus.textContent = 'No matches found';
    const emptyItem = document.createElement('li');
    emptyItem.className = 'suggestion-empty';
    emptyItem.textContent = `No cities matched "${query}". Please check the spelling or try a nearby major city.`;
    dom.suggestionsList.appendChild(emptyItem);
    dom.suggestionsPanel.hidden = false;
    dom.cityInput.setAttribute('aria-expanded', 'true');
    announceStatus(`No cities matched ${query}`);
    return;
  }

  dom.suggestionsStatus.textContent = `Matching locations (${locations.length})`;

  const items = locations.map((loc, index) => {
    const li = document.createElement('li');
    li.role = 'option';
    li.id = `suggestion-item-${index}`;
    li.setAttribute('aria-selected', 'false');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'suggestion-option';
    btn.tabIndex = -1;

    const mainDiv = document.createElement('div');
    mainDiv.className = 'suggestion-main';

    const citySpan = document.createElement('span');
    citySpan.className = 'suggestion-city';
    citySpan.textContent = loc.name;

    const metaParts = [loc.region, loc.country].filter(Boolean);
    const metaSpan = document.createElement('span');
    metaSpan.className = 'suggestion-meta';
    metaSpan.textContent = metaParts.join(', ') || 'International Location';

    mainDiv.append(citySpan, metaSpan);

    const coordsSpan = document.createElement('span');
    coordsSpan.className = 'suggestion-coords';
    coordsSpan.textContent = `${loc.latitude.toFixed(2)}°, ${loc.longitude.toFixed(2)}°`;

    btn.append(mainDiv, coordsSpan);
    btn.addEventListener('click', () => {
      selectLocation(loc);
    });

    li.appendChild(btn);
    return li;
  });

  dom.suggestionsList.replaceChildren(...items);
  dom.suggestionsPanel.hidden = false;
  dom.cityInput.setAttribute('aria-expanded', 'true');
  announceStatus(`${locations.length} matching locations found for ${query}`);
}

function closeSuggestions() {
  state.suggestions = [];
  state.highlightedIndex = -1;
  dom.suggestionsPanel.hidden = true;
  dom.suggestionsList.replaceChildren();
  dom.cityInput.setAttribute('aria-expanded', 'false');
  dom.cityInput.removeAttribute('aria-activedescendant');
}

function updateHighlightedSuggestion(nextIndex) {
  if (state.suggestions.length === 0) return;

  const total = state.suggestions.length;
  const bounded = ((nextIndex % total) + total) % total;
  state.highlightedIndex = bounded;

  const optionEls = dom.suggestionsList.querySelectorAll('[role="option"]');
  optionEls.forEach((el, idx) => {
    const btn = el.querySelector('.suggestion-option');
    const isSelected = idx === bounded;
    el.setAttribute('aria-selected', String(isSelected));
    if (btn) {
      btn.classList.toggle('is-highlighted', isSelected);
    }
    if (isSelected) {
      dom.cityInput.setAttribute('aria-activedescendant', el.id);
      el.scrollIntoView({ block: 'nearest' });
    }
  });
}

/**
 * Select a location and fetch its real-time weather forecast.
 */
function selectLocation(location) {
  closeSuggestions();
  dom.cityInput.value = location.country ? `${location.name}, ${location.country}` : location.name;
  dom.clearSearchBtn.hidden = false;
  fetchWeatherForLocation(location, { forceRefresh: true });
}

/**
 * Fetch real-time weather, hourly forecast, and 7-day forecast from Open-Meteo.
 */
async function fetchWeatherForLocation(location, { forceRefresh = false } = {}) {
  if (
    !forceRefresh &&
    state.isFetchingForecast &&
    state.currentLocation &&
    state.currentLocation.latitude === location.latitude &&
    state.currentLocation.longitude === location.longitude
  ) {
    return;
  }

  if (state.forecastAbortController) {
    state.forecastAbortController.abort();
  }
  const controller = new AbortController();
  state.forecastAbortController = controller;
  state.forecastRequestId += 1;
  const activeRequestId = state.forecastRequestId;

  hideError();
  setLoading(true, `Loading forecast for ${location.name}...`);

  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'weather_code',
      'cloud_cover',
      'pressure_msl',
      'wind_speed_10m',
      'wind_direction_10m',
    ].join(','),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation_probability',
      'weather_code',
      'wind_speed_10m',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'precipitation_probability_max',
      'sunrise',
      'sunset',
    ].join(','),
    temperature_unit: 'celsius',
    wind_speed_unit: 'kmh',
    timezone: 'auto',
    forecast_days: '7',
  });

  try {
    const response = await fetch(`${FORECAST_API_URL}?${params.toString()}`, {
      signal: createRequestSignal(controller, REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Weather API error (HTTP ${response.status})`);
    }

    const data = await response.json();

    if (activeRequestId !== state.forecastRequestId) {
      return;
    }

    if (!data || !data.current || !data.hourly || !data.daily) {
      throw new Error('Incomplete forecast payload returned by Open-Meteo.');
    }

    state.currentLocation = location;
    state.weatherData = data;
    state.lastFetchedAt = new Date();

    saveRecentLocation(location);
    renderWeatherDashboard();
    setLoading(false);
    dom.emptyState.hidden = true;
    dom.dashboard.hidden = false;
    dom.dashboard.classList.remove('is-entering');
    void dom.dashboard.offsetWidth;
    dom.dashboard.classList.add('is-entering');

    const conditionLabel = getWeatherMeta(data.current.weather_code, data.current.is_day === 1).label;
    announceStatus(
      `Weather updated for ${location.name}. Currently ${formatTemp(data.current.temperature_2m)}, ${conditionLabel}.`
    );
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return;
    }
    if (activeRequestId !== state.forecastRequestId) {
      return;
    }
    setLoading(false);
    if (state.weatherData) {
      dom.dashboard.hidden = false;
    } else {
      dom.emptyState.hidden = false;
    }
    const isTimeout = error instanceof DOMException && error.name === 'TimeoutError';
    showError(
      isTimeout ? 'Weather Request Timed Out' : 'Weather Data Unavailable',
      isTimeout
        ? 'The Open-Meteo weather service took too long to respond. Please try again.'
        : 'Unable to fetch real-time forecast data right now. Please check your connection and try again.'
    );
  }
}

/**
 * Reverse-geocode coordinates if possible to display a human-readable location name.
 */
async function reverseGeocodeCoordinates(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: String(latitude),
    longitude: String(longitude),
    localityLanguage: 'en',
  });

  try {
    const response = await fetch(`${REVERSE_GEOCODE_URL}?${params.toString()}`, {
      signal: AbortSignal.timeout(4500),
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    const city = data.city || data.locality || data.principalSubdivision;
    if (!city) {
      return null;
    }
    return {
      name: city,
      region: data.principalSubdivision && data.principalSubdivision !== city ? data.principalSubdivision : '',
      country: data.countryName || data.countryCode || '',
    };
  } catch {
    return null;
  }
}

/**
 * Request browser geolocation explicitly on user button click.
 */
function handleUseMyLocation() {
  closeSuggestions();
  hideError();

  if (!('geolocation' in navigator)) {
    showError('Geolocation Unsupported', 'Your browser does not support location detection. Please search for a city manually.');
    return;
  }

  setLoading(true, 'Waiting for browser location permission...');

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      setLoading(true, 'Resolving your location and live forecast...');

      const resolved = await reverseGeocodeCoordinates(latitude, longitude);
      const location = {
        name: resolved?.name || 'Current Location',
        region: resolved?.region || '',
        country: resolved?.country || 'GPS Coordinates',
        latitude,
        longitude,
      };

      dom.cityInput.value = location.name === 'Current Location' ? '' : location.name;
      dom.clearSearchBtn.hidden = dom.cityInput.value.length === 0;
      fetchWeatherForLocation(location, { forceRefresh: true });
    },
    (geoError) => {
      setLoading(false);
      if (state.weatherData) {
        dom.dashboard.hidden = false;
      } else {
        dom.emptyState.hidden = false;
      }

      switch (geoError.code) {
        case geoError.PERMISSION_DENIED:
          showError(
            'Location Permission Denied',
            'Location access was denied. Allow location permission in your browser site settings or search for any city above.'
          );
          break;
        case geoError.POSITION_UNAVAILABLE:
          showError(
            'Location Unavailable',
            'Your device could not determine its current position. Please try again or search for a city manually.'
          );
          break;
        case geoError.TIMEOUT:
          showError(
            'Location Request Timed Out',
            'Detecting your position took too long. Please try again or search for a city manually.'
          );
          break;
        default:
          showError(
            'Unable to Detect Location',
            'An unexpected geolocation error occurred. Please search for a city manually.'
          );
      }
    },
    {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 300000,
    }
  );
}

/**
 * Render all dashboard sections from the cached Open-Meteo response.
 */
function renderWeatherDashboard() {
  const { currentLocation, weatherData } = state;
  if (!currentLocation || !weatherData) return;

  const { current, hourly, daily, timezone } = weatherData;
  const isDay = current.is_day === 1;
  const meta = getWeatherMeta(current.weather_code, isDay);

  // Update dynamic weather theme and document title
  dom.body.dataset.weatherTheme = meta.theme;
  document.title = `${formatTemp(current.temperature_2m)} ${currentLocation.name} | SkyCast`;

  // Hero metadata
  dom.locationHeading.textContent = currentLocation.name;
  const regionParts = [currentLocation.region, currentLocation.country].filter(Boolean);
  dom.locationRegion.textContent = regionParts.join(', ') || 'Selected Coordinates';
  dom.localDatetime.textContent = formatLocationNow(timezone, current.time);
  dom.locationCoords.textContent = formatCoordinates(currentLocation.latitude, currentLocation.longitude);

  // Day / Night indicator
  dom.dayNightBadge.classList.toggle('is-night', !isDay);
  dom.dayNightText.textContent = isDay ? 'Daytime' : 'Nighttime';

  // Current weather hero showcase
  dom.currentWeatherIcon.replaceChildren(createWeatherSvg(meta.icon, isDay));
  dom.currentTemp.textContent = formatTemp(current.temperature_2m);
  dom.currentCondition.textContent = meta.label;

  dom.feelsLikeTemp.textContent = formatTemp(current.apparent_temperature);
  const todayMax = daily.temperature_2m_max?.[0];
  const todayMin = daily.temperature_2m_min?.[0];
  dom.todayRange.textContent =
    todayMax !== undefined && todayMin !== undefined
      ? `${formatTempShort(todayMax)} / ${formatTempShort(todayMin)}`
      : '—';
  dom.lastUpdated.textContent = state.lastFetchedAt
    ? state.lastFetchedAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : '—';

  // Atmospheric detail cards
  dom.detailHumidity.textContent = formatMetric(current.relative_humidity_2m, '%');
  dom.detailHumidityNote.textContent = getHumidityNote(current.relative_humidity_2m);

  dom.detailWindSpeed.textContent = formatMetric(current.wind_speed_10m, 'km/h', 1);

  const windDeg = current.wind_direction_10m;
  const cardinal = getCardinalDirection(windDeg);
  dom.detailWindDir.textContent = cardinal;
  dom.detailWindDeg.textContent =
    windDeg !== null && windDeg !== undefined ? `${Math.round(windDeg)}° meteorological` : 'Direction unavailable';
  if (windDeg !== null && windDeg !== undefined && !Number.isNaN(Number(windDeg))) {
    dom.windCompassArrow.style.transform = `rotate(${Math.round(Number(windDeg))}deg)`;
  }

  dom.detailPrecipitation.textContent = formatMetric(current.precipitation, 'mm', 1);
  dom.detailCloudCover.textContent = formatMetric(current.cloud_cover, '%');
  dom.detailPressure.textContent = formatMetric(current.pressure_msl, 'hPa');

  dom.detailSunrise.textContent = formatLocalTimeFromIso(daily.sunrise?.[0], true);
  dom.detailSunset.textContent = formatLocalTimeFromIso(daily.sunset?.[0], true);

  renderHourlyForecast(hourly, daily, current.time, timezone);
  renderDailyForecast(daily);
  renderRecentLocations();
}

/**
 * Render the next 24 hours horizontal forecast in the location's local timezone.
 */
function renderHourlyForecast(hourly, daily, currentIso, timezone) {
  dom.hourlyTimezoneBadge.textContent = timezone ? timezone.replaceAll('_', ' ') : 'Local Time';

  const times = hourly.time || [];
  if (times.length === 0) {
    dom.hourlyList.replaceChildren();
    return;
  }

  const currentHourPrefix = typeof currentIso === 'string' ? currentIso.slice(0, 13) : '';
  let startIndex = times.findIndex((timeStr) => timeStr.slice(0, 13) >= currentHourPrefix);
  if (startIndex === -1) startIndex = 0;

  const endIndex = Math.min(startIndex + 24, times.length);
  const cards = [];

  for (let i = startIndex; i < endIndex; i += 1) {
    const timeStr = times[i];
    const temp = hourly.temperature_2m?.[i];
    const precipProb = hourly.precipitation_probability?.[i];
    const code = hourly.weather_code?.[i];
    const isDaySlot = isHourDaytime(timeStr, daily);
    const meta = getWeatherMeta(code, isDaySlot);

    const li = document.createElement('li');
    li.className = 'hourly-card';
    if (i === startIndex) {
      li.classList.add('is-now');
    }

    const timeEl = document.createElement('span');
    timeEl.className = 'hourly-time';
    timeEl.textContent = i === startIndex ? 'Now' : formatLocalTimeFromIso(timeStr, false);

    const iconWrap = document.createElement('div');
    iconWrap.className = 'hourly-icon';
    iconWrap.title = meta.label;
    iconWrap.appendChild(createWeatherSvg(meta.icon, isDaySlot));

    const tempEl = document.createElement('span');
    tempEl.className = 'hourly-temp';
    tempEl.textContent = formatTempShort(temp);

    const precipEl = document.createElement('span');
    precipEl.className = 'hourly-precip';
    precipEl.appendChild(createDropSvg());
    const precipText = document.createElement('span');
    precipText.textContent =
      precipProb !== null && precipProb !== undefined ? `${Math.round(precipProb)}%` : '—';
    precipEl.appendChild(precipText);

    li.append(timeEl, iconWrap, tempEl, precipEl);
    cards.push(li);
  }

  dom.hourlyList.replaceChildren(...cards);
}

/**
 * Render the 7-day forecast using the actual daily API arrays.
 */
function renderDailyForecast(daily) {
  const dates = daily.time || [];
  if (dates.length === 0) {
    dom.dailyList.replaceChildren();
    return;
  }

  const mins = (daily.temperature_2m_min || []).filter((v) => typeof v === 'number');
  const maxs = (daily.temperature_2m_max || []).filter((v) => typeof v === 'number');
  const globalMin = mins.length > 0 ? Math.min(...mins) : 0;
  const globalMax = maxs.length > 0 ? Math.max(...maxs) : 1;
  const span = Math.max(globalMax - globalMin, 1);

  const rows = dates.map((dateStr, idx) => {
    const code = daily.weather_code?.[idx];
    const maxTemp = daily.temperature_2m_max?.[idx];
    const minTemp = daily.temperature_2m_min?.[idx];
    const precipProb = daily.precipitation_probability_max?.[idx];
    const meta = getWeatherMeta(code, true);

    const li = document.createElement('li');
    li.className = 'daily-row';

    const dayEl = document.createElement('span');
    dayEl.className = 'daily-day';
    dayEl.textContent = formatDateLabel(dateStr, idx);

    const iconWrap = document.createElement('div');
    iconWrap.className = 'daily-icon';
    iconWrap.appendChild(createWeatherSvg(meta.icon, true));

    const condEl = document.createElement('span');
    condEl.className = 'daily-condition';
    condEl.textContent = meta.label;

    const precipEl = document.createElement('span');
    precipEl.className = 'daily-precip';
    precipEl.appendChild(createDropSvg());
    const precipVal = document.createElement('span');
    precipVal.textContent =
      precipProb !== null && precipProb !== undefined ? `${Math.round(precipProb)}%` : '—';
    precipEl.appendChild(precipVal);

    const tempsEl = document.createElement('div');
    tempsEl.className = 'daily-temps';

    const minEl = document.createElement('span');
    minEl.className = 'daily-min';
    minEl.textContent = formatTempShort(minTemp);

    const barTrack = document.createElement('div');
    barTrack.className = 'daily-bar-track';
    barTrack.setAttribute('aria-hidden', 'true');
    const barFill = document.createElement('div');
    barFill.className = 'daily-bar-fill';
    if (typeof minTemp === 'number' && typeof maxTemp === 'number') {
      const leftPct = ((minTemp - globalMin) / span) * 100;
      const widthPct = Math.max(((maxTemp - minTemp) / span) * 100, 10);
      barFill.style.setProperty('--bar-left', `${leftPct.toFixed(1)}%`);
      barFill.style.setProperty('--bar-width', `${Math.min(widthPct, 100 - leftPct).toFixed(1)}%`);
    }
    barTrack.appendChild(barFill);

    const maxEl = document.createElement('span');
    maxEl.className = 'daily-max';
    maxEl.textContent = formatTempShort(maxTemp);

    tempsEl.append(minEl, barTrack, maxEl);
    li.append(dayEl, iconWrap, condEl, precipEl, tempsEl);
    return li;
  });

  dom.dailyList.replaceChildren(...rows);
}

/**
 * Switch between Celsius and Fahrenheit locally without additional API requests.
 */
function setTemperatureUnit(unit) {
  if (unit !== 'C' && unit !== 'F') return;
  if (state.unit === unit) return;

  state.unit = unit;
  const isCelsius = unit === 'C';
  dom.unitCelsiusBtn.classList.toggle('is-active', isCelsius);
  dom.unitCelsiusBtn.setAttribute('aria-pressed', String(isCelsius));
  dom.unitFahrenheitBtn.classList.toggle('is-active', !isCelsius);
  dom.unitFahrenheitBtn.setAttribute('aria-pressed', String(!isCelsius));

  if (state.weatherData) {
    renderWeatherDashboard();
    announceStatus(`Temperature unit switched to ${isCelsius ? 'Celsius' : 'Fahrenheit'}`);
  }
}

/**
 * Wire up all UI event listeners.
 */
function initializeEvents() {
  dom.searchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (event.isComposing) return;

    if (state.highlightedIndex >= 0 && state.suggestions[state.highlightedIndex]) {
      selectLocation(state.suggestions[state.highlightedIndex]);
      return;
    }

    const query = dom.cityInput.value.trim();
    if (query.length < 2) {
      closeSuggestions();
      showError('Enter a City Name', 'Please type at least 2 characters to search for a city.');
      dom.cityInput.focus();
      return;
    }

    hideError();
    window.clearTimeout(state.debounceTimer);
    const results = await fetchCitySuggestions(query);
    if (results && results.length === 1) {
      selectLocation(results[0]);
    }
  });

  dom.cityInput.addEventListener('input', () => {
    const value = dom.cityInput.value;
    dom.clearSearchBtn.hidden = value.length === 0;
    window.clearTimeout(state.debounceTimer);

    const trimmed = value.trim();
    if (trimmed.length < 2) {
      closeSuggestions();
      return;
    }

    state.debounceTimer = window.setTimeout(() => {
      if (trimmed !== state.lastSearchQuery || dom.suggestionsPanel.hidden) {
        fetchCitySuggestions(trimmed);
      }
    }, 320);
  });

  dom.cityInput.addEventListener('keydown', (event) => {
    if (event.isComposing) return;

    if (event.key === 'ArrowDown' && state.suggestions.length > 0) {
      event.preventDefault();
      updateHighlightedSuggestion(state.highlightedIndex + 1);
    } else if (event.key === 'ArrowUp' && state.suggestions.length > 0) {
      event.preventDefault();
      updateHighlightedSuggestion(
        state.highlightedIndex <= 0 ? state.suggestions.length - 1 : state.highlightedIndex - 1
      );
    } else if (event.key === 'Escape') {
      closeSuggestions();
    }
  });

  dom.clearSearchBtn.addEventListener('click', () => {
    dom.cityInput.value = '';
    dom.clearSearchBtn.hidden = true;
    state.lastSearchQuery = '';
    closeSuggestions();
    dom.cityInput.focus();
  });

  document.addEventListener('click', (event) => {
    if (!dom.searchContainer.contains(event.target)) {
      closeSuggestions();
    }
  });

  dom.locationBtn.addEventListener('click', handleUseMyLocation);
  dom.emptyLocationBtn.addEventListener('click', handleUseMyLocation);
  dom.emptySearchFocusBtn.addEventListener('click', () => {
    dom.cityInput.focus();
  });

  dom.refreshBtn.addEventListener('click', () => {
    if (state.currentLocation) {
      fetchWeatherForLocation(state.currentLocation, { forceRefresh: true });
    }
  });

  dom.unitCelsiusBtn.addEventListener('click', () => setTemperatureUnit('C'));
  dom.unitFahrenheitBtn.addEventListener('click', () => setTemperatureUnit('F'));

  dom.clearHistoryBtn.addEventListener('click', clearRecentLocations);
  dom.dismissErrorBtn.addEventListener('click', hideError);
}

function init() {
  state.recentLocations = loadRecentLocations();
  renderRecentLocations();
  initializeEvents();
}

init();
