"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.useGlobalPipes(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('SmartFolio API')
        .setDescription('API documentation for SmartFolio')
        .setVersion('1.0')
        .addBearerAuth() // allows JWT auth in Swagger
        .build();
    //Deployment:
    const port = process.env.PORT || 3000;
    const frontendOrigin = process.env.NODE_ENV === 'production'
        ? 'https://your-frontend.vercel.app' // update after frontend deployment
        : 'http://localhost:8000';
    app.enableCors({ origin: frontendOrigin, credentials: true });
    await app.listen(port);
    console.log(`Server running on port ${port}`);
    // app.enableCors({
    //   origin: 'http://localhost:8000', // frontend URL
    //   credentials: true,
    // });
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api', app, document);
    await app.listen(3000);
    console.log('Server running on http://localhost:3000');
}
bootstrap();
