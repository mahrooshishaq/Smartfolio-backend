import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { OnboardingDto, UpdateProfileDto, UserContextDto } from '../../common/dto/onboarding.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/authenticated-request.interface';

@ApiTags('Onboarding')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing or invalid JWT token' })
@Controller('onboarding')
@UseGuards(JwtAuthGuard)
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('complete')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Complete initial onboarding',
    description: 'Submit career goals, experience level, education and industry. Must be called before resume analysis to personalize AI scoring.',
  })
  @ApiCreatedResponse({ description: 'Onboarding saved successfully' })
  async completeOnboarding(
    @Req() req: AuthenticatedRequest,
    @Body() onboardingDto: OnboardingDto,
  ): Promise<{ message: string; userContext: UserContextDto }> {
    const userContext = await this.onboardingService.completeOnboarding(
      req.user.id,
      onboardingDto,
    );

    return {
      message: 'Onboarding completed successfully',
      userContext,
    };
  }

  @Put('profile')
  @ApiOperation({
    summary: 'Update career profile',
    description: 'Update any profile fields (role, location, skills, bio, etc.) after initial onboarding.',
  })
  @ApiOkResponse({ description: 'Profile updated successfully' })
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() updateDto: UpdateProfileDto,
  ): Promise<{ message: string; userContext: UserContextDto }> {
    const userContext = await this.onboardingService.updateProfile(
      req.user.id,
      updateDto,
    );

    return {
      message: 'Profile updated successfully',
      userContext,
    };
  }

  @Get('context')
  @ApiOperation({
    summary: 'Get user context snapshot',
    description: 'Returns a structured summary of the user\'s career profile used internally by the LLM for personalized analysis.',
  })
  @ApiOkResponse({ description: 'User context returned' })
  async getUserContext(
    @Req() req: AuthenticatedRequest,
  ): Promise<UserContextDto> {
    return this.onboardingService.getUserContext(req.user.id);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Check onboarding completion status',
    description: 'Returns whether the user has completed initial onboarding. Frontend uses this to redirect new users.',
  })
  @ApiOkResponse({ description: '{ completed: boolean }' })
  async getOnboardingStatus(
    @Req() req: AuthenticatedRequest,
  ): Promise<{ completed: boolean }> {
    const completed = await this.onboardingService.hasCompletedOnboarding(
      req.user.id,
    );
    return { completed };
  }
}
