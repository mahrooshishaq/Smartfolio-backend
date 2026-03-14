import { IsEmail, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com', description: 'Registered email address' })
  @IsNotEmpty({ message: 'Email is a required field.' }) 
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password@123', description: 'Account password' })
  @IsNotEmpty({ message: 'Password is a required field.' }) 
  @MinLength(6)
  password!: string;
}
