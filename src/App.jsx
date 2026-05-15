import { useEffect, useState } from 'react';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://back-clima-vjxu.onrender.com';
const RAIN_DROPS = Array.from({ length: 38 }, (_, index) => ({
  id: `drop-${index}`,
  left: `${(index * 11) % 100}%`,
  delay: `${(index % 9) * -0.45}s`,
  duration: `${0.9 + (index % 5) * 0.22}s`,
  opacity: 0.2 + (index % 4) * 0.15,
}));
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

function getWeatherTag(code) {
  if (code === 0 || code === 1) return 'SOL';
  if (code >= 2 && code <= 3) return 'NUBL';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return 'CHVA';
  if (code >= 71 && code <= 77) return 'NEVE';
  if (code >= 95) return 'RAIO';
  if (code >= 45 && code <= 48) return 'NEVO';

  return 'TEMPO';
}

function getWeatherScene(code, isDay = 1) {
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) {
    return 'rain';
  }

  if ((code === 0 || code === 1) && isDay === 1) {
    return 'sun';
  }

  return 'cloud';
}

function formatDate(date) {
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${date}T00:00:00`));

  return formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
}

function buildWeatherAlerts(weatherData) {
  if (!weatherData) {
    return [];
  }

  const current = weatherData.current || {};
  const today = weatherData.daily?.[0] || {};
  const rainChance = Number(today.precipitationProbability ?? 0);
  const weatherCode = Number(current.weatherCode ?? today.weatherCode ?? -1);
  const precipitationNow = Number(current.precipitation ?? 0);
  const tempNow = Number(current.temperature ?? 0);
  const tempMax = Number(today.tempMax ?? tempNow);
  const tempMin = Number(today.tempMin ?? tempNow);
  const uvIndexMax = Number(today.uvIndexMax ?? 0);
  const alerts = [];

  const hasRainRisk =
    rainChance >= 40 || precipitationNow > 0 || RAIN_CODES.has(weatherCode);
  const hasStrongSun = weatherCode === 0 || weatherCode === 1 || tempMax >= 30;

  if (hasRainRisk) {
    if (rainChance > 0) {
      alerts.push(
        `Chance de chuva de ${Math.round(
          rainChance,
        )}% hoje. Melhor levar um guarda-chuva.`,
      );
    } else {
      alerts.push('Tem risco de chuva hoje. Melhor levar um guarda-chuva.');
    }
  }

  if (hasStrongSun) {
    alerts.push('Vai fazer bastante sol. Nao esqueca do protetor solar.');
  }

  if (uvIndexMax >= 6) {
    alerts.push(`Indice UV alto (${uvIndexMax.toFixed(1)}). Reforce o protetor ao longo do dia.`);
  }

  if (tempMax >= 33) {
    alerts.push(
      'Calor forte previsto. Beba bastante agua e evite o sol nas horas mais quentes.',
    );
  }

  if (tempMin <= 14) {
    alerts.push('Pode esfriar no periodo da noite. Vale levar um casaco leve.');
  }

  if (alerts.length === 0) {
    alerts.push('Tempo mais estavel hoje. Ainda vale conferir a previsao antes de sair.');
  }

  return alerts.slice(0, 3);
}

function formatUvValue(uvValue) {
  const uvNumber = Number(uvValue);

  if (Number.isNaN(uvNumber)) {
    return '--';
  }

  return uvNumber.toFixed(1);
}

function getUvInfo(uvValue) {
  const uvNumber = Number(uvValue);

  if (Number.isNaN(uvNumber)) {
    return { label: 'Sem leitura', className: 'uv-unknown', value: '--' };
  }

  if (uvNumber >= 11) {
    return { label: 'Extremo', className: 'uv-extreme', value: uvNumber.toFixed(1) };
  }

  if (uvNumber >= 8) {
    return { label: 'Muito alto', className: 'uv-very-high', value: uvNumber.toFixed(1) };
  }

  if (uvNumber >= 6) {
    return { label: 'Alto', className: 'uv-high', value: uvNumber.toFixed(1) };
  }

  if (uvNumber >= 3) {
    return { label: 'Moderado', className: 'uv-moderate', value: uvNumber.toFixed(1) };
  }

  return { label: 'Baixo', className: 'uv-low', value: uvNumber.toFixed(1) };
}

function getHourFromDateTime(dateTime) {
  if (!dateTime || typeof dateTime !== 'string') {
    return null;
  }

  const [, timePart = ''] = dateTime.split('T');
  const hour = Number(timePart.slice(0, 2));

  return Number.isFinite(hour) ? hour : null;
}

function getDayPhase(hour) {
  const safeHour = Number.isFinite(hour) ? hour : new Date().getHours();

  if (safeHour >= 5 && safeHour < 12) {
    return 'morning';
  }

  if (safeHour >= 12 && safeHour < 18) {
    return 'afternoon';
  }

  return 'night';
}

function formatClock(dateTime) {
  if (!dateTime || typeof dateTime !== 'string') {
    return '--:--';
  }

  const [, timePart = ''] = dateTime.split('T');
  return timePart.slice(0, 5) || '--:--';
}

function App() {
  const [city, setCity] = useState('Sao Paulo');
  const [weatherData, setWeatherData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const weatherScene = getWeatherScene(
    weatherData?.current?.weatherCode ?? 2,
    weatherData?.current?.isDay ?? 1,
  );
  const dayPhase = getDayPhase(getHourFromDateTime(weatherData?.current?.time));
  const weatherAlerts = buildWeatherAlerts(weatherData);
  const todayForecast = weatherData?.daily?.[0] || null;
  const todayUv = getUvInfo(todayForecast?.uvIndexMax);

  async function loadWeather(selectedCity) {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_URL}/api/weather?city=${encodeURIComponent(selectedCity)}`,
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao buscar previsao');
      }

      setWeatherData(data);
    } catch (apiError) {
      setError(apiError.message);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    const normalizedCity = city.trim();

    if (!normalizedCity) {
      setError('Digite uma cidade para buscar.');
      return;
    }

    loadWeather(normalizedCity);
  }

  useEffect(() => {
    loadWeather('Sao Paulo');
  }, []);

  return (
    <main className={`weather-page scene-${weatherScene} phase-${dayPhase}`}>
      <div className={`scene-layer scene-layer-${weatherScene}`} aria-hidden="true">
        {weatherScene === 'rain' ? (
          <div className="rain-field">
            {RAIN_DROPS.map((drop) => (
              <span
                key={drop.id}
                className="rain-drop"
                style={{
                  left: drop.left,
                  animationDelay: drop.delay,
                  animationDuration: drop.duration,
                  opacity: drop.opacity,
                }}
              />
            ))}
          </div>
        ) : null}

        {weatherScene === 'sun' ? (
          <div className="sun-field">
            <span className="sun-orb" />
            <span className="sun-rays" />
            <span className="sun-ray-arc" />
          </div>
        ) : null}

        {weatherScene === 'cloud' ? (
          <div className="cloud-field">
            <span className="cloud cloud-a" />
            <span className="cloud cloud-b" />
            <span className="cloud cloud-c" />
          </div>
        ) : null}
      </div>

      <section className="hero-panel">
        <h1>Previsao do Tempo</h1>

        <form className="search-form" onSubmit={handleSubmit}>
          <label htmlFor="city-input">Cidade</label>
          <div className="search-row">
            <input
              id="city-input"
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Ex: Rio de Janeiro"
            />
            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </form>
      </section>

      {error ? <p className="error-box">{error}</p> : null}

      {weatherData ? (
        <section className="weather-content">
          <article className="current-card">
            <div className="location-block">
              <h2>{weatherData.location.name}</h2>
              <p>
                {weatherData.location.region
                  ? `${weatherData.location.region}, `
                  : ''}
                {weatherData.location.country}
              </p>
            </div>

            <div className="current-main">
              <span className="weather-icon">
                {getWeatherTag(weatherData.current.weatherCode)}
              </span>
              <div>
                <strong>{Math.round(weatherData.current.temperature)} C</strong>
                <p>{weatherData.current.weatherDescription}</p>
              </div>
            </div>

            <div className="metrics-grid">
              <p>
                Sensacao termica
                <span>{Math.round(weatherData.current.feelsLike)} C</span>
              </p>
              <p>
                Umidade
                <span>{weatherData.current.humidity}%</span>
              </p>
              <p>
                Vento
                <span>{Math.round(weatherData.current.windSpeed)} km/h</span>
              </p>
              <p>
                Precipitacao
                <span>{weatherData.current.precipitation} mm</span>
              </p>
            </div>

            <div className="highlights-grid">
              <p>
                Indice UV maximo
                <span className={`uv-badge ${todayUv.className}`}>
                  {todayUv.value} · {todayUv.label}
                </span>
              </p>
              <p>
                Nascer do sol
                <span>{formatClock(todayForecast?.sunrise)}</span>
              </p>
              <p>
                Por do sol
                <span>{formatClock(todayForecast?.sunset)}</span>
              </p>
              <p>
                Periodo atual
                <span>
                  {weatherData.current.isDay === 1
                    ? 'Dia'
                    : weatherData.current.isDay === 0
                    ? 'Noite'
                    : '--'}
                </span>
              </p>
            </div>

            <div className="alerts-box">
              <h3>Avisos para hoje</h3>
              <ul className="alerts-list">
                {weatherAlerts.map((alert, index) => (
                  <li key={`${alert}-${index}`}>{alert}</li>
                ))}
              </ul>
            </div>
          </article>

          <article className="forecast-card">
            <h3>Proximos 7 dias</h3>
            <div className="daily-grid">
              {weatherData.daily.map((day, index) => (
                <section
                  className="daily-item"
                  key={day.date}
                  style={{ '--delay': `${index * 65}ms` }}
                >
                  <p className="day-label">{formatDate(day.date)}</p>
                  <span className="day-icon">{getWeatherTag(day.weatherCode)}</span>
                  <p className="day-desc">{day.weatherDescription}</p>
                  <p className="day-temp">
                    <strong>{Math.round(day.tempMax)} C</strong>
                    <span>{Math.round(day.tempMin)} C</span>
                  </p>
                  <p className="day-rain">Chuva: {day.precipitationProbability}%</p>
                  <p className="day-uv">UV max: {formatUvValue(day.uvIndexMax)}</p>
                </section>
              ))}
            </div>
          </article>
        </section>
      ) : null}
    </main>
  );
}

export default App;
