import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true , forbidNonWhitelisted: true}));
  const config = new DocumentBuilder()
    .setTitle('SmartFolio API')
    .setDescription('API documentation for SmartFolio')
    .setVersion('1.0')
    .addBearerAuth() // allows JWT auth in Swagger
    .build();
    //Deployment:
    const port = process.env.PORT || 3000;
const frontendOrigin = process.env.NODE_ENV === 'production'
  ? 'https://your-frontend.vercel.app'  // update after frontend deployment
  : 'http://localhost:8000';

app.enableCors({ origin: frontendOrigin, credentials: true });
await app.listen(port);
console.log(`Server running on port ${port}`);
// app.enableCors({
//   origin: 'http://localhost:8000', // frontend URL
//   credentials: true,
// });

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
  console.log('Server running on http://localhost:3000');
}
bootstrap();
