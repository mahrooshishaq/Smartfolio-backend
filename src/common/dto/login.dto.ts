import { IsEmail, MinLength, IsNotEmpty } from 'class-validator';

export class LoginDto {
  @IsNotEmpty({ message: 'Email is a required field.' }) 
  @IsEmail()
  email!: string;

  @IsNotEmpty({ message: 'Password is a required field.' }) 
  @MinLength(6)
  password!: string;
}
