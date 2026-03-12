import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
     private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {
    const clientID = config.get<string>('GOOGLE_CLIENT_ID') || 'placeholder';
    const clientSecret = config.get<string>('GOOGLE_CLIENT_SECRET') || 'placeholder';
    
    super({
      clientID,
      clientSecret,
      callbackURL: `${config.get<string>('FRONTEND_URL') || 'http://localhost:3000'}/auth/google/callback`,
      scope: ['email', 'profile'],
    });
    
    if (clientID === 'placeholder') {
      console.log('⚠️  Google OAuth disabled - GOOGLE_CLIENT_ID not configured');
    }
  }

   async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, id } = profile;

    const googleUser = {
      email: emails[0].value,
      name: `${name.givenName} ${name.familyName}`,
      googleId: id,
    };

    const user = await this.authService.googleAuth(googleUser);
    done(null, user);
  }
}
