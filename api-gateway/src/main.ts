import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const envOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
  ];

  const allowedOrigins = envOrigins.length > 0 ? envOrigins : defaultOrigins;

  // Enable CORS for the frontend
  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests without an Origin header.
      if (!origin) {
        callback(null, true);
        return;
      }

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS blocked for origin: ${origin}`), false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  // Ensure the API Gateway listens on its designated port
  await app.listen(process.env.PORT ?? 3000).catch((err) => {
    console.error('Error starting the server:', err);
  });
}
bootstrap().catch((error) => {
  console.error('Error during app bootstrap:', error);
  process.exit(1); // Exit process on failure
});
