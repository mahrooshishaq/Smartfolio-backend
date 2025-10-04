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

  async sendOtpEmail(to: string, name: string, otp:string) {
    try {
      await this.transporter.sendMail({
        from: `"Smartfolio" <${this.config.get<string>('SMTP_USER')}>`,
        to,
        subject: 'Welcome to Smartfolio.',
        text: `Hello ${name}, <br>Your OTP code is: ${otp}. It will expire in 10 minutes.`,
        html: `<p>Hello ${name}, <br> Your OTP code is: <b>${otp}</b></p><p>It will expire in 10 minutes.</p>`,
      });
    } catch (err) {
    console.error('Full email sending error:', err);  // <-- LOG FULL ERROR
    throw new InternalServerErrorException('Failed to send email');
  }
  }
  async sendResetPasswordEmail(to: string, resetLink: string, name:string) {
    const mailOptions = {
      from: `"Smartfolio" <${process.env.SMTP_USER}>`,
      to,
      subject: 'Password Reset Request',
      html: `
        <p>Hi ${name},</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <a href="${resetLink}">Reset Password</a>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }
}

