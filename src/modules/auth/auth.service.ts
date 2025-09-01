import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private readonly usersService: UsersService) {}

  async signup(name: string, email: string, password: string) {
    const hashedPassword = await bcrypt.hash(password, 10);
    return this.usersService.createUser(name, email, hashedPassword);
  }

  async findUserByEmail(email: string) {
    return this.usersService.findByEmail(email);
  }
}
