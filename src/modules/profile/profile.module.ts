import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule], // so guards and strategies can be used
  controllers: [ProfileController],
})
export class ProfileModule {}
