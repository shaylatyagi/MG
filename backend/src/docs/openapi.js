/**
 * openapi.js — OpenAPI 3.0 spec for MobilityGrid API
 * Served as JSON at GET /api/docs/json
 * Swagger UI (CDN) renders it at GET /api/docs
 */

const spec = {
  openapi: '3.0.3',
  info: {
    title: 'MobilityGrid API',
    version: '1.0.0',
    description: 'Fleet management platform for drivers, owners and managers.',
    contact: { email: 'dev@mobilitygrid.in' },
  },
  servers: [
    { url: 'https://newmg.onrender.com', description: 'Production' },
    { url: 'http://localhost:5000',      description: 'Local dev' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          message: { type: 'string' },
          errors:  { type: 'array', items: { type: 'object' } },
        },
      },
      OtpRequest: {
        type: 'object', required: ['phone', 'role'],
        properties: {
          phone: { type: 'string', example: '9876543210' },
          role:  { type: 'string', enum: ['DRIVER', 'OWNER', 'MANAGER'] },
        },
      },
      OtpVerify: {
        type: 'object', required: ['phone', 'role', 'otp'],
        properties: {
          phone: { type: 'string' },
          role:  { type: 'string', enum: ['DRIVER', 'OWNER', 'MANAGER'] },
          otp:   { type: 'string', example: '123456' },
        },
      },
      LoginPin: {
        type: 'object', required: ['phone', 'role', 'pin'],
        properties: {
          phone: { type: 'string' },
          role:  { type: 'string', enum: ['DRIVER', 'OWNER', 'MANAGER'] },
          pin:   { type: 'string', minLength: 4, maxLength: 6 },
        },
      },
      Driver: {
        type: 'object',
        properties: {
          id:           { type: 'integer' },
          name:         { type: 'string' },
          phone_number: { type: 'string' },
          vehicle_id:   { type: 'integer', nullable: true },
          status:       { type: 'string', enum: ['ACTIVE', 'INACTIVE'] },
          created_at:   { type: 'string', format: 'date-time' },
        },
      },
      Vehicle: {
        type: 'object',
        properties: {
          id:                  { type: 'integer' },
          registration_number: { type: 'string' },
          type:                { type: 'string' },
          rent_type:           { type: 'string', enum: ['DAILY', 'MONTHLY', 'FIXED'] },
          daily_rent:          { type: 'number' },
          status:              { type: 'string' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check with DB ping',
        security: [],
        responses: {
          200: {
            description: 'Service healthy',
            content: { 'application/json': { schema: {
              type: 'object',
              properties: {
                status:    { type: 'string', example: 'ok' },
                db:        { type: 'string', example: 'ok' },
                latencyMs: { type: 'integer', example: 12 },
                ts:        { type: 'string', format: 'date-time' },
                env:       { type: 'string' },
              },
            }}},
          },
          503: { description: 'DB unreachable' },
        },
      },
    },
    '/api/auth/send-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Send OTP to phone',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OtpRequest' } } } },
        responses: {
          200: { description: 'OTP sent' },
          400: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          429: { description: 'Rate limited' },
        },
      },
    },
    '/api/auth/verify-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Verify OTP — returns JWT if PIN already set',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/OtpVerify' } } } },
        responses: {
          200: { description: 'OTP verified / JWT returned' },
          400: { description: 'Invalid OTP' },
        },
      },
    },
    '/api/auth/login-pin': {
      post: {
        tags: ['Auth'],
        summary: 'Login with phone + PIN — returns JWT',
        security: [],
        requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginPin' } } } },
        responses: {
          200: { description: 'JWT token' },
          401: { description: 'Wrong PIN' },
        },
      },
    },
    '/api/owner/vehicles': {
      get: {
        tags: ['Owner — Vehicles'],
        summary: 'List all vehicles for this owner',
        responses: {
          200: { description: 'Array of vehicles', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Vehicle' } } } } },
        },
      },
      post: {
        tags: ['Owner — Vehicles'],
        summary: 'Add a new vehicle',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['registration_number'],
            properties: {
              registration_number: { type: 'string', example: 'MH12AB1234' },
              make:  { type: 'string' },
              model: { type: 'string' },
              year:  { type: 'integer' },
            },
          }}},
        },
        responses: {
          201: { description: 'Vehicle created' },
          400: { description: 'Validation error' },
        },
      },
    },
    '/api/owner/drivers': {
      get: {
        tags: ['Owner — Drivers'],
        summary: 'List all drivers for this owner',
        responses: { 200: { description: 'Array of drivers' } },
      },
      post: {
        tags: ['Owner — Drivers'],
        summary: 'Add a driver to your fleet',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['name', 'phone'],
            properties: {
              name:  { type: 'string', example: 'Ravi Kumar' },
              phone: { type: 'string', example: '9876543210' },
            },
          }}},
        },
        responses: {
          201: { description: 'Driver created' },
          400: { description: 'Validation error' },
        },
      },
    },
    '/api/driver/location': {
      post: {
        tags: ['Driver'],
        summary: 'Update driver GPS location (every 30s)',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: {
            type: 'object', required: ['latitude', 'longitude'],
            properties: {
              latitude:  { type: 'number', example: 18.5204 },
              longitude: { type: 'number', example: 73.8567 },
              accuracy:  { type: 'number' },
            },
          }}},
        },
        responses: { 200: { description: 'Location updated' } },
      },
    },
    '/api/driver/sos': {
      post: {
        tags: ['Driver'],
        summary: 'Trigger SOS alert',
        requestBody: {
          content: { 'application/json': { schema: {
            type: 'object',
            properties: {
              message:   { type: 'string', example: 'Accident on highway' },
              latitude:  { type: 'number' },
              longitude: { type: 'number' },
            },
          }}},
        },
        responses: { 200: { description: 'SOS sent to owner' } },
      },
    },
  },
};

module.exports = spec;
