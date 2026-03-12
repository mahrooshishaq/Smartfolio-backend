import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { ApiBearerAuth, ApiTags, ApiExcludeController } from '@nestjs/swagger';

@ApiExcludeController()
@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  @Get()
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() req: AuthenticatedRequest) {
    return {
      message: 'Protected route success',
      user: req.user,
    };
  }
}
