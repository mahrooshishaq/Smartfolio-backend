import { Controller, Post, Body, BadRequestException, Logger, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignupDto } from '../../common/dto/signup.dto';
import { LoginDto } from '../../common/dto/login.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Request } from 'express'; // ✅ import Request
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name); // declare logger here
  constructor(private readonly authService: AuthService) {}
  

  @Post('signup')
   @ApiOperation({ summary: 'Create a new user' })
 @ApiBody({
    description: 'Signup payload',
    type: SignupDto,
    examples: {
      valid: {
        summary: 'Valid input',
        value: { email: 'test@example.com', password: 'MyPass@123', name: 'John Doe' },
      },
      invalidEmail: {
        summary: 'Invalid email format',
        value: { email: 'testexample.com', password: 'MyPass@123', name: 'John Doe' },
      },
      invalidPassword: {
        summary: 'Invalid password (no uppercase/special char)',
        value: { email: 'test@example.com', password: 'mypassword', name: 'John Doe' },
      },
      bothInvalid: {
        summary: 'Both email and password invalid',
        value: { email: 'testexample.com', password: 'mypassword', name: 'John Doe' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    schema: {
      example: {
        message: 'User created successfully',
        user: { id: 'uuid', email: 'test@example.com', name: 'John Doe' },
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed',
    schema: {
      example: {
        statusCode: 400,
        message: [
          'Email must be valid',
          'Password must contain at least 1 uppercase letter and 1 special character',
        ],
        error: 'Bad Request',
      },
    },
  })
async signup(@Body() dto: SignupDto) {
    try {
      const { name, email, password } = dto;

      // 1️⃣ Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        this.logger.warn(`Signup failed: Invalid email format: ${email}`);
        throw new BadRequestException('Invalid email format');
      }

      // 2️⃣ Password strength validation
      const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+{}[\]:;<>,.?~\\/-]).{8,}$/;
      if (!passwordRegex.test(password)) {
        this.logger.warn(
          `Signup failed for email ${email}: Password does not meet strength requirements`
        );
        throw new BadRequestException(
          'Password must be at least 8 characters long, contain 1 uppercase letter, and 1 special character',
        );
      }

      // 3️⃣ Check if user already exists
      const existingUser = await this.authService.findUserByEmail(email);
      if (existingUser) {
        this.logger.warn(`Signup failed: Email already registered: ${email}`);
        throw new BadRequestException('Email already registered');
      }

      // 4️⃣ Create user
      const user = await this.authService.signup(name, email, password);

      this.logger.log(`User created successfully: ${email}`);
      return { message: 'User created successfully', userId: user.user.id, tokens: user };
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Signup failed for email ${dto.email}: ${error.message}`);
        throw error;
      } else {
        this.logger.error(`Signup failed for email ${dto.email}: Unknown error`);
        throw new BadRequestException('Signup failed due to unknown error');
      }
    }
  }

  @Post('login')
  @ApiOperation({ summary: 'User Login' })
  @ApiBody({
    description: 'Login payload',
    type: LoginDto,
    examples: {
      valid: {
        summary: 'Valid credentials',
        value: { email: 'test@example.com', password: 'MyPass@123' },
      },
      invalidEmail: {
        summary: 'Email not registered',
        value: { email: 'unknown@example.com', password: 'MyPass@123' },
      },
      invalidPassword: {
        summary: 'Wrong password',
        value: { email: 'test@example.com', password: 'wrongPass' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      example: {
        message: 'Login successful',
        user: { id: 'uuid', email: 'test@example.com', name: 'John Doe' },
        accessToken: 'jwt-access-token',
        refreshToken: 'jwt-refresh-token',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    schema: {
      example: {
        statusCode: 401,
        message: 'Invalid credentials',
        error: 'Unauthorized',
      },
    },
  })
  async login(@Body() dto: LoginDto) {
    try {
      const { email, password } = dto;

      // Basic checks for empty email/password
      if (!email || !password) {
        this.logger.warn('Login failed: Email or password missing');
        throw new BadRequestException('Email and password are required');
      }

      const result = await this.authService.login(email, password);
      this.logger.log(`User logged in successfully: ${email}`);
      return result;
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Login failed for email ${dto.email}: ${error.message}`);
        throw error;
      } else {
        this.logger.error(`Login failed for email ${dto.email}: Unknown error`);
        throw new BadRequestException('Login failed due to unknown error');
      }
    }
  }
   @Post('refresh')
  @ApiOperation({ summary: 'Refresh JWT tokens using refresh token' })
  @ApiBody({
    description: 'Refresh token payload',
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: 'uuid-of-user' },
        refreshToken: { type: 'string', example: 'refresh-token-here' },
      },
      required: ['userId', 'refreshToken'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    schema: {
      example: {
        message: 'Tokens refreshed successfully',
        user: { id: 'uuid', email: 'test@example.com', name: 'John Doe' },
        accessToken: 'new-jwt-access-token',
        refreshToken: 'new-jwt-refresh-token',
      },
    },
  })
  async refresh(@Body() body: { userId: string; refreshToken: string }) {
    const { userId, refreshToken } = body;
    return this.authService.refreshTokens(userId, refreshToken);
  }
   @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout user and revoke refresh token' })
  async logout(@Req() req: Request) { // ✅ type req as Request
    const userId = (req.user as any).id; // user comes from JWT guard
    await this.authService.logout(userId);
    return { message: 'Logged out successfully' };
  }
}
