jest.mock('axios', () => ({
  get: jest.fn(),
}));

const axios = require('axios');
const { OpenMeteoProvider, weatherProviderService } = require('../dist/modules/weather/weatherProvider.service');
const { ForecastHorizon } = require('../dist/modules/weather/weather.types');

describe('Open-Meteo weather provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('maps current conditions from Open-Meteo into the internal schema', async () => {
    axios.get.mockResolvedValue({
      data: {
        current: {
          time: '2026-03-16T09:00',
          temperature_2m: 24.3,
          apparent_temperature: 25.1,
          relative_humidity_2m: 67,
          precipitation: 1.2,
          cloud_cover: 54,
          pressure_msl: 1012.3,
          wind_speed_10m: 13.4,
          wind_direction_10m: 210,
          wind_gusts_10m: 20.1,
          visibility: 8000,
          dew_point_2m: 18.4,
          uv_index: 7.1,
        },
      },
    });

    const provider = new OpenMeteoProvider();
    const result = await provider.fetchCurrent(0.3476, 32.5825);

    expect(result.source).toBe('open_meteo');
    expect(result.providerRef).toBe('2026-03-16T09:00');
    expect(result.reading).toMatchObject({
      temperatureCelsius: 24.3,
      feelsLikeCelsius: 25.1,
      humidity: 67,
      rainfallMm: 1.2,
      rainfallMmPerHour: 1.2,
      cloudCoverPct: 54,
      pressureHPa: 1012.3,
      windSpeedKph: 13.4,
      windDirectionDeg: 210,
      windGustKph: 20.1,
      visibilityKm: 8,
      dewPointCelsius: 18.4,
      uvIndex: 7.1,
    });
  });

  test('maps hourly forecast data from Open-Meteo into prediction rows', async () => {
    axios.get.mockResolvedValue({
      data: {
        hourly: {
          time: ['2026-03-16T10:00', '2026-03-16T11:00'],
          temperature_2m: [25.2, 26.1],
          relative_humidity_2m: [65, 63],
          precipitation_probability: [35, 50],
          precipitation: [0.4, 1.1],
          cloud_cover: [40, 58],
          wind_speed_10m: [12.5, 14.2],
          wind_direction_10m: [205, 220],
          uv_index: [6.2, 7.4],
        },
      },
    });

    const provider = new OpenMeteoProvider();
    const result = await provider.fetchForecast(0.3476, 32.5825, ForecastHorizon.HOURLY);

    expect(result.source).toBe('open_meteo');
    expect(result.horizon).toBe('hourly');
    expect(result.predictions).toHaveLength(2);
    expect(result.predictions[0]).toMatchObject({
      temperatureCelsius: 25.2,
      humidity: 65,
      rainfallMm: 0.4,
      precipitationProbabilityPct: 35,
      windSpeedKph: 12.5,
      windDirectionDeg: 205,
      cloudCoverPct: 40,
      uvIndex: 6.2,
    });
  });

  test('registers Open-Meteo as an available provider', () => {
    expect(weatherProviderService.getProviderNames()).toContain('open_meteo');
  });
});
