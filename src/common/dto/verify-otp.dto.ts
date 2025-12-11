import { IsEmail, IsNotEmpty, Length } from 'class-validator';

export class VerifyOtpDto {
  @IsNotEmpty({ message: 'Email is required.' })
  @IsEmail({}, { message: 'Invalid email format.' })
  email!: string;

  @IsNotEmpty({ message: 'OTP is required.' })
  @Length(4,4)
  otp!: string;
}