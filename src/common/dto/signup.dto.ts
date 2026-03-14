import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignupDto {
  @ApiProperty({ example: 'John Doe', description: 'Full name of the user' })
  @IsNotEmpty({ message: 'Name is a required field.' })
  name!: string;

  @ApiProperty({ example: 'john@example.com', description: 'User email address' })
  @IsNotEmpty({ message: 'Email is a required field.' }) 
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Password@123', description: 'Password (min 8 chars, uppercase + special char)' })
  @IsNotEmpty({ message: 'Password is a required field.' }) 
  @MinLength(8, { message: 'Password must be at least 8 characters long and must contain uppercase and special characters' })
  password!: string;
}
