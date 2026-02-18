import type { OpenAPIV3_1 } from 'openapi-types';

const auth = [{ BearerAuth: [] }];
const r = (s: object) => ({ required: true, content: { 'application/json': { schema: s } } });
const pageParam = { $ref: '#/components/parameters/pageParam' };
const limitParam = { $ref: '#/components/parameters/limitParam' };

export const weatherPaths: OpenAPIV3_1.PathsObject = {

  '/api/v1/weather/forecast': {
    get: {
      tags: ['Weather'],
      summary: 'Get weather forecast',
      description: 'Returns current conditions plus N-day forecast for a location.',
      operationId: 'getWeatherForecast',
      parameters: [
        { name: 'lat', in: 'query', required: true, schema: { type: 'number', minimum: -90, maximum: 90 }, example: 0.3476 },
        { name: 'lng', in: 'query', required: true, schema: { type: 'number', minimum: -180, maximum: 180 }, example: 32.5825 },
        { name: 'days', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 14, default: 7 }, description: 'Forecast horizon in days.' },
        { name: 'units', in: 'query', schema: { type: 'string', enum: ['metric', 'imperial'], default: 'metric' } },
      ],
      responses: {
        200: {
          description: 'Forecast data.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'object',
                        properties: {
                          current: {
                            type: 'object',
                            properties: {
                              temperature: { type: 'number' },
                              humidity: { type: 'number' },
                              rainfall: { type: 'number' },
                              windSpeed: { type: 'number' },
                              uvIndex: { type: 'number' },
                              description: { type: 'string' },
                              icon: { type: 'string' },
                            },
                          },
                          daily: {
                            type: 'array',
                            items: {
                              type: 'object',
                              properties: {
                                date: { type: 'string', format: 'date' },
                                tempHigh: { type: 'number' },
                                tempLow: { type: 'number' },
                                rainfall: { type: 'number' },
                                humidity: { type: 'number' },
                                description: { type: 'string' },
                                agriAdvisory: { type: 'string', description: 'AI-generated farming advisory for the day.' },
                              },
                            },
                          },
                          soilTemperature: { type: 'number' },
                          evapotranspiration: { type: 'number', description: 'mm/day — useful for irrigation planning.' },
                        },
                      },
                    },
                  },
                ],
              },
            },
          },
        },
        400: { $ref: '#/components/responses/ValidationError' },
      },
    },
  },

  '/api/v1/weather/alerts': {
    get: {
      tags: ['Weather'],
      summary: 'List weather alerts',
      description: 'Returns active weather alerts (storms, drought, frost, flood) for a region.',
      operationId: 'getWeatherAlerts',
      parameters: [
        pageParam, limitParam,
        { name: 'region', in: 'query', schema: { type: 'string' } },
        { name: 'country', in: 'query', schema: { type: 'string' } },
        { name: 'severity', in: 'query', schema: { type: 'string', enum: ['advisory', 'watch', 'warning', 'emergency'] } },
        { name: 'alertType', in: 'query', schema: { type: 'string', enum: ['drought', 'flood', 'storm', 'frost', 'heatwave', 'locusts', 'general'] } },
        { name: 'activeOnly', in: 'query', schema: { type: 'boolean', default: true } },
      ],
      responses: {
        200: {
          description: 'Alert list.',
          content: {
            'application/json': {
              schema: {
                allOf: [
                  { $ref: '#/components/schemas/SuccessResponse' },
                  { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/WeatherAlert' } }, meta: { $ref: '#/components/schemas/PaginationMeta' } } },
                ],
              },
            },
          },
        },
      },
    },
    post: {
      tags: ['Weather', 'Admin'],
      summary: 'Create weather alert',
      description: 'Requires `platform_admin` or meteorologist role.',
      operationId: 'createWeatherAlert',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['title', 'alertType', 'severity', 'regions', 'startsAt', 'endsAt'],
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          alertType: { type: 'string', enum: ['drought', 'flood', 'storm', 'frost', 'heatwave', 'locusts', 'general'] },
          severity: { type: 'string', enum: ['advisory', 'watch', 'warning', 'emergency'] },
          regions: { type: 'array', items: { type: 'string' }, minItems: 1 },
          countries: { type: 'array', items: { type: 'string' } },
          startsAt: { type: 'string', format: 'date-time' },
          endsAt: { type: 'string', format: 'date-time' },
          actionable: { type: 'string', description: 'Recommended actions for farmers.' },
          affectedCrops: { type: 'array', items: { type: 'string' } },
        },
      }),
      responses: { 201: { description: 'Alert created.' }, 400: { $ref: '#/components/responses/ValidationError' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/weather/alerts/{id}': {
    get: {
      tags: ['Weather'],
      summary: 'Get weather alert by ID',
      operationId: 'getWeatherAlert',
      parameters: [{ $ref: '#/components/parameters/mongoIdPath' }],
      responses: { 200: { description: 'Alert.' }, 404: { $ref: '#/components/responses/NotFound' } },
    },
    patch: {
      tags: ['Weather', 'Admin'],
      summary: 'Update weather alert',
      operationId: 'updateWeatherAlert',
      security: auth,
      parameters: [{ $ref: '#/components/parameters/mongoIdPath' }],
      requestBody: r({ type: 'object', properties: { severity: { type: 'string' }, description: { type: 'string' }, endsAt: { type: 'string', format: 'date-time' }, active: { type: 'boolean' } } }),
      responses: { 200: { description: 'Updated.' }, 403: { $ref: '#/components/responses/Forbidden' } },
    },
  },

  '/api/v1/weather/subscriptions': {
    get: {
      tags: ['Weather'],
      summary: 'Get my weather subscriptions',
      operationId: 'getWeatherSubscriptions',
      security: auth,
      responses: { 200: { description: 'Subscriptions.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    post: {
      tags: ['Weather'],
      summary: 'Subscribe to weather alerts for a location',
      operationId: 'createWeatherSubscription',
      security: auth,
      requestBody: r({
        type: 'object',
        required: ['location'],
        properties: {
          location: { type: 'object', required: ['lat', 'lng'], properties: { lat: { type: 'number' }, lng: { type: 'number' }, name: { type: 'string' } } },
          alertTypes: { type: 'array', items: { type: 'string', enum: ['drought', 'flood', 'storm', 'frost', 'heatwave', 'locusts', 'general'] } },
          channels: { type: 'array', items: { type: 'string', enum: ['push', 'sms', 'email', 'in_app'] } },
          minSeverity: { type: 'string', enum: ['advisory', 'watch', 'warning', 'emergency'], default: 'watch' },
        },
      }),
      responses: { 201: { description: 'Subscribed.' }, 400: { $ref: '#/components/responses/ValidationError' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/weather/subscriptions/{id}': {
    patch: {
      tags: ['Weather'],
      summary: 'Update weather subscription',
      operationId: 'updateWeatherSubscription',
      security: auth,
      parameters: [{ $ref: '#/components/parameters/mongoIdPath' }],
      requestBody: r({ type: 'object', properties: { alertTypes: { type: 'array', items: { type: 'string' } }, channels: { type: 'array', items: { type: 'string' } }, active: { type: 'boolean' } } }),
      responses: { 200: { description: 'Updated.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
    delete: {
      tags: ['Weather'],
      summary: 'Delete weather subscription',
      operationId: 'deleteWeatherSubscription',
      security: auth,
      parameters: [{ $ref: '#/components/parameters/mongoIdPath' }],
      responses: { 200: { description: 'Deleted.' }, 401: { $ref: '#/components/responses/Unauthorized' } },
    },
  },

  '/api/v1/weather/agricultural': {
    get: {
      tags: ['Weather'],
      summary: 'Agricultural weather summary',
      description: 'Returns growing degree days, evapotranspiration, and crop-specific weather advisories.',
      operationId: 'agriculturalWeather',
      parameters: [
        { name: 'lat', in: 'query', required: true, schema: { type: 'number' } },
        { name: 'lng', in: 'query', required: true, schema: { type: 'number' } },
        { name: 'cropType', in: 'query', schema: { type: 'string' }, description: 'Tailor advisories to a specific crop.' },
      ],
      responses: { 200: { description: 'Agricultural weather.' }, 400: { $ref: '#/components/responses/ValidationError' } },
    },
  },
};
