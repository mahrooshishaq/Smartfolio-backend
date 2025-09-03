import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Profile')      // Groups it in Swagger
@ApiBearerAuth()         // Shows lock icon, requires token in Swagger
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
