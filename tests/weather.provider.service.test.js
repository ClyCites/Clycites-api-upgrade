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
          weather_code: 3,
          is_day: 1,
        },
        hourly: {
          time: ['2026-03-16T09:00'],
          weather_code: [3],
          is_day: [1],
          vapour_pressure_deficit: [1.23],
          evapotranspiration: [0.18],
          et0_fao_evapotranspiration: [0.22],
          shortwave_radiation: [420],
          direct_radiation: [260],
          diffuse_radiation: [160],
          direct_normal_irradiance: [510],
          sunshine_duration: [2400],
          soil_temperature_0cm: [22.5],
          soil_temperature_6cm: [23.1],
          soil_moisture_0_to_1cm: [0.19],
          soil_moisture_1_to_3cm: [0.21],
          soil_moisture_3_to_9cm: [0.24],
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
      weatherCode: 3,
      isDay: true,
      vapourPressureDeficitKPa: 1.23,
      evapotranspirationMm: 0.18,
      et0FaoEvapotranspirationMm: 0.22,
      shortwaveRadiationWm2: 420,
      directRadiationWm2: 260,
      diffuseRadiationWm2: 160,
      directNormalIrradianceWm2: 510,
      sunshineDurationSeconds: 2400,
      soilTemperature0cm: 22.5,
      soilTemperature6cm: 23.1,
      soilMoisture0To1cm: 0.19,
      soilMoisture1To3cm: 0.21,
      soilMoisture3To9cm: 0.24,
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
          weather_code: [2, 3],
          is_day: [1, 1],
          vapour_pressure_deficit: [1.4, 1.7],
          evapotranspiration: [0.16, 0.21],
          et0_fao_evapotranspiration: [0.19, 0.25],
          shortwave_radiation: [410, 560],
          direct_radiation: [250, 330],
          diffuse_radiation: [160, 230],
          direct_normal_irradiance: [520, 710],
          sunshine_duration: [1800, 2700],
          soil_temperature_0cm: [21.2, 22.4],
          soil_temperature_6cm: [22.8, 23.0],
          soil_moisture_0_to_1cm: [0.18, 0.17],
          soil_moisture_1_to_3cm: [0.2, 0.19],
          soil_moisture_3_to_9cm: [0.23, 0.22],
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
      weatherCode: 2,
      isDay: true,
      vapourPressureDeficitKPa: 1.4,
      evapotranspirationMm: 0.16,
      et0FaoEvapotranspirationMm: 0.19,
      shortwaveRadiationWm2: 410,
      directRadiationWm2: 250,
      diffuseRadiationWm2: 160,
      directNormalIrradianceWm2: 520,
      sunshineDurationSeconds: 1800,
      soilTemperature0cm: 21.2,
      soilTemperature6cm: 22.8,
      soilMoisture0To1cm: 0.18,
      soilMoisture1To3cm: 0.2,
      soilMoisture3To9cm: 0.23,
    });
  });

  test('maps daily agronomic forecast fields from Open-Meteo', async () => {
    axios.get.mockResolvedValue({
      data: {
        daily: {
          time: ['2026-03-16'],
          temperature_2m_max: [29.4],
          temperature_2m_min: [18.8],
          relative_humidity_2m_mean: [69],
          precipitation_sum: [2.4],
          precipitation_probability_max: [55],
          wind_speed_10m_max: [18.6],
          wind_direction_10m_dominant: [214],
          cloud_cover_mean: [48],
          uv_index_max: [9.2],
          weather_code: [95],
          sunrise: ['2026-03-16T06:54'],
          sunset: ['2026-03-16T19:01'],
          daylight_duration: [43594.94],
          sunshine_duration: [40574.73],
          shortwave_radiation_sum: [24.89],
          et0_fao_evapotranspiration: [5.2],
        },
      },
    });

    const provider = new OpenMeteoProvider();
    const result = await provider.fetchForecast(0.3476, 32.5825, ForecastHorizon.DAILY);

    expect(result.predictions[0]).toMatchObject({
      tempMaxCelsius: 29.4,
      tempMinCelsius: 18.8,
      humidity: 69,
      rainfallMm: 2.4,
      precipitationProbabilityPct: 55,
      windSpeedKph: 18.6,
      windDirectionDeg: 214,
      cloudCoverPct: 48,
      uvIndex: 9.2,
      weatherCode: 95,
      sunshineDurationSeconds: 40574.73,
      daylightDurationSeconds: 43594.94,
      shortwaveRadiationSumMjM2: 24.89,
      et0FaoEvapotranspirationMm: 5.2,
    });
    expect(result.predictions[0].sunrise).toBeInstanceOf(Date);
    expect(result.predictions[0].sunset).toBeInstanceOf(Date);
  });

  test('registers Open-Meteo as an available provider', () => {
    expect(weatherProviderService.getProviderNames()).toContain('open_meteo');
  });
});
