import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

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

}
