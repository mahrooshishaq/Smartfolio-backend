import { ConflictException, Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User } from '../users/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  private async signTokens(user: User) {
    const payload = { sub: user.id, email: user.email };
    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get<string>('JWT_ACCESS_TTL') || '15m',
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: this.config.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get<string>('JWT_REFRESH_TTL') || '7d',
    });

    return { accessToken, refreshToken };
  }

  private async setRefreshToken(userId: string, refreshToken: string) {
    const hash = await bcrypt.hash(refreshToken, 10);
    await this.usersService.updateRefreshToken(userId, hash);
  }

  async signup(name: string, email: string, password: string) {
      // ------------------- 1️⃣ Basic required field checks -------------------
    if (!name?.trim()) throw new BadRequestException('Name is required');
    if (!email?.trim()) throw new BadRequestException('Email is required');
    if (!password?.trim()) throw new BadRequestException('Password is required');

    // ------------------- 2️⃣ Email format validation -------------------
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) throw new BadRequestException('Invalid email format');

    // ------------------- 3️⃣ Password strength validation -------------------
    if (password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(password)) {
      throw new BadRequestException('Password must contain at least one uppercase letter');
    }
    if (!/[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(password)) {
      throw new BadRequestException('Password must contain at least one special character');
    }

    // ------------------- 4️⃣ Check for existing user -------------------
    const exists = await this.usersService.findByEmail(email);
    if (exists) throw new ConflictException('Email already registered');

    // ------------------- 5️⃣ Create user -------------------
    const hashed = await bcrypt.hash(password, 10);
    const user = await this.usersService.createUser(name, email, hashed);

    // ------------------- 6️⃣ Sign JWT tokens -------------------
    const tokens = await this.signTokens(user);
    await this.setRefreshToken(user.id, tokens.refreshToken);

    return {
      message: 'User created successfully',
      user: { id: user.id, email: user.email, name: user.name },
      ...tokens,
    };
  }

  async login(email: string, password: string) {
    // ------------------- 1️⃣ Basic required field checks -------------------
  if (!email?.trim()) throw new BadRequestException('Email is required');
  if (!password?.trim()) throw new BadRequestException('Password is required');

  // ------------------- 2️⃣ Email format validation -------------------
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) throw new BadRequestException('Invalid email format');

  // ------------------- 3️⃣ Find user -------------------
  const user = await this.usersService.findByEmail(email);
  if (!user) {
    throw new UnauthorizedException('Email not registered');
  }

  // ------------------- 4️⃣ Check password -------------------
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    throw new UnauthorizedException('Invalid password');
  }

  // ------------------- 5️⃣ Sign JWT tokens -------------------
  const tokens = await this.signTokens(user);
  await this.setRefreshToken(user.id, tokens.refreshToken);

  return {
      message: 'Login successful',
      user: { id: user.id, email: user.email, name: user.name },
      ...tokens,
    };
  }

  // extra helper if you need to call it from controller
  async findUserByEmail(email: string) {
    return this.usersService.findByEmail(email);
  }

  async refreshTokens(userId: string, refreshToken: string) {
  const user = await this.usersService.findById(userId);
  if (!user || !user.refreshTokenHash) {
    throw new UnauthorizedException('Access denied');
  }

  const tokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
  if (!tokenMatches) {
    throw new UnauthorizedException('Invalid refresh token');
  }

  const tokens = await this.signTokens(user);
  await this.setRefreshToken(user.id, tokens.refreshToken);

  return {
    message: 'Tokens refreshed successfully',
    user: { id: user.id, email: user.email, name: user.name },
    ...tokens,
  };
}
async logout(userId: string) {
  const user = await this.usersService.findById(userId);
  if (!user) throw new UnauthorizedException('User not found');

  // Clear hashed refresh token
  user.refreshTokenHash = null;
  await this.usersService.updateRefreshToken(userId,null);

  return { message: 'Logged out successfully' };
}


}
