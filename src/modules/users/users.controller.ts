import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

@Get(':id')
async getUser(@Param('id') id: string): Promise<User | null> {
  return this.usersService.findById(id);
}
@Post()
 async create(@Body() userData: { name: string; email: string; password: string }): Promise<User> {
    return this.usersService.createUser(userData.name, userData.email, userData.password);
  }
}
