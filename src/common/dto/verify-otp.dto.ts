import { IsEmail, IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({ example: 'john@example.com', description: 'Email address OTP was sent to' })
  @IsNotEmpty({ message: 'Email is required.' })
  @IsEmail({}, { message: 'Invalid email format.' })
  email!: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code from email' })
  @IsNotEmpty({ message: 'OTP is required.' })
  @Length(6,6)
  otp!: string;
}