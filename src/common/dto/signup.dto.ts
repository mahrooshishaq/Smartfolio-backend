import { IsEmail, IsNotEmpty, MinLength } from 'class-validator';

export class SignupDto {
  @IsNotEmpty({ message: 'Name is a required field.' })
  name!: string;

  @IsNotEmpty({ message: 'Email is a required field.' }) 
  @IsEmail()
  email!: string;

  @IsNotEmpty({ message: 'Password is a required field.' }) 
  @MinLength(8, { message: 'Password must be at least 8 characters long and must contain uppercase and special characters' })
  password!: string;
}
