import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { ProfileModule } from './modules/profile/profile.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), 
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'asnaprivate',
      password: '12345678',
      database: 'smartfolio',
      entities: [__dirname + '/modules/**/*.entity{.ts,.js}'],
      synchronize: true, // dev only
    }),
    UsersModule,
    AuthModule,
    ProfileModule,
  ],
  controllers: [AppController], // add your controller here
  providers: [AppService],      // add your service here
})
export class AppModule {}
