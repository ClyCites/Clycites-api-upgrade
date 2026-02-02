import dotenv from 'dotenv';

dotenv.config();

interface Config {
  app: {
    env: string;
    port: number;
    apiVersion: string;
  };
  db: {
    uri: string;
    testUri: string;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    expire: string;
    refreshExpire: string;
  };
  otp: {
    expire: string;
    length: number;
  };
  email: {
    host: string;
    port: number;
    user: string;
    pass: string;
    from: string;
  };
  sms: {
    provider: string;
    twilio: {
      accountSid: string;
      authToken: string;
      phoneNumber: string;
    };
  };
  payment: {
    mtnMomo: {
      apiKey: string;
      userId: string;
      subscriptionKey: string;
      callbackUrl: string;
    };
    airtelMoney: {
      apiKey: string;
      clientId: string;
      clientSecret: string;
    };
  };
  weather: {
    apiKey: string;
    apiUrl: string;
  };
  ai: {
    serviceUrl: string;
    apiKey: string;
  };
  upload: {
    maxFileSize: number;
    uploadPath: string;
  };
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  logging: {
    level: string;
    filePath: string;
  };
  cors: {
    allowedOrigins: string[];
  };
  admin: {
    email: string;
    initialPassword: string;
  };
}

const config: Config = {
  app: {
    env: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '5000', 10),
    apiVersion: process.env.API_VERSION || 'v1',
  },
  db: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/clycites',
    testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/clycites_test',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your_jwt_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your_refresh_secret',
    expire: process.env.JWT_EXPIRE || '15m',
    refreshExpire: process.env.JWT_REFRESH_EXPIRE || '7d',
  },
  otp: {
    expire: process.env.OTP_EXPIRE || '10m',
    length: parseInt(process.env.OTP_LENGTH || '6', 10),
  },
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.EMAIL_FROM || 'noreply@clycites.com',
  },
  sms: {
    provider: process.env.SMS_PROVIDER || 'twilio',
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || '',
    },
  },
  payment: {
    mtnMomo: {
      apiKey: process.env.MTN_MOMO_API_KEY || '',
      userId: process.env.MTN_MOMO_USER_ID || '',
      subscriptionKey: process.env.MTN_MOMO_SUBSCRIPTION_KEY || '',
      callbackUrl: process.env.MTN_MOMO_CALLBACK_URL || '',
    },
    airtelMoney: {
      apiKey: process.env.AIRTEL_MONEY_API_KEY || '',
      clientId: process.env.AIRTEL_MONEY_CLIENT_ID || '',
      clientSecret: process.env.AIRTEL_MONEY_CLIENT_SECRET || '',
    },
  },
  weather: {
    apiKey: process.env.WEATHER_API_KEY || '',
    apiUrl: process.env.WEATHER_API_URL || 'https://api.openweathermap.org/data/2.5',
  },
  ai: {
    serviceUrl: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    apiKey: process.env.AI_SERVICE_API_KEY || '',
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10),
    uploadPath: process.env.UPLOAD_PATH || './uploads',
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || './logs',
  },
  cors: {
    allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@clycites.com',
    initialPassword: process.env.ADMIN_INITIAL_PASSWORD || 'changeme',
  },
};

export default config;
