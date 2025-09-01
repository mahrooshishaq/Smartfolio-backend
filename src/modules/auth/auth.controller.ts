import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../../common/dto/create-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  async signup(@Body() createUserDto: CreateUserDto) {
    const { name, email, password } = createUserDto;

    // Check if user already exists
   const existingUser = await this.authService.findUserByEmail(email);
    if (existingUser) {
      throw new BadRequestException('Email already registered');
    }

    // Create user
    const user = await this.authService.signup(name, email, password);
    return { message: 'User created successfully', userId: user.id };
  }
}
