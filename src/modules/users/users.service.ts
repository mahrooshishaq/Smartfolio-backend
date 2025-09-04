import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

async createUser(name: string, email: string, password: string): Promise<User> {
    const user = this.userRepository.create({ name, email, password });
    return this.userRepository.save(user);
  }
async findByEmail(email: string): Promise<User | null> {
  return this.userRepository.findOne({ where: { email } });
}

async findById(id: string): Promise<User | null> {
  return this.userRepository.findOne({ where: { id } });
}
async updateRefreshToken(userId: string, refreshTokenHash: string | null): Promise<void> {
    await this.userRepository.update({ id: userId }, { refreshTokenHash });
  }
 async saveOtp(userId: string, otp: string, expiryMinutes: number) {
    const salt = await bcrypt.genSalt();
    const otpHash = await bcrypt.hash(otp, salt);

    const expiry = new Date();
    expiry.setMinutes(expiry.getMinutes() + expiryMinutes);

    await this.userRepository.update(userId, {
      otpHash,
      otpExpiry: expiry,
    });
  }
async verifyOtp(userId: string, otp: string): Promise<boolean> {
    const user = await this.findById(userId);
    if (!user || !user.otpHash || !user.otpExpiry) return false;

    const now = new Date();
    if (user.otpExpiry < now){  // OTP expired — clear it from DB
      await this.userRepository.update(userId, {
        otpHash: null,
        otpExpiry: null,
      });
      return false; // expired
    }

    const isMatch = await bcrypt.compare(otp, user.otpHash);
    if (!isMatch) return false;

    // OTP is correct — clear it
    await this.userRepository.update(userId, {
      otpHash: null,
      otpExpiry: null,
    });

    return true;
  }

  // Mark email verified
  async markEmailVerified(userId: string) {
    await this.userRepository.update(userId, { isVerified: true,  otpHash: null,
      otpExpiry: null });
  }
  async setRefreshTokenIssuedAt(userId: string, date: Date): Promise<void> {
  await this.userRepository.update(userId, { refreshTokenIssuedAt: date });
}

}

