import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private transporter;

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get<string>('SMTP_HOST'),
      port: this.config.get<number>('SMTP_PORT'),
      secure: false, // true for 465, false for 587
      auth: {
        user: this.config.get<string>('SMTP_USER'),
        pass: this.config.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendOtpEmail(to: string, otp: string) {
    try {
      await this.transporter.sendMail({
        from: `"SmartFolio" <${this.config.get<string>('SMTP_USER')}>`,
        to,
        subject: 'Welcome to SmartFolio. Your OTP Code',
        text: `Your OTP code is: ${otp}. It will expire in 10 minutes.`,
        html: `<p>Your OTP code is: <b>${otp}</b></p><p>It will expire in 10 minutes.</p>`,
      });
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Failed to send email');
    }
  }
}

