"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const users_service_1 = require("../users/users.service");
const config_1 = require("@nestjs/config");
const bcrypt = __importStar(require("bcrypt"));
const mail_service_1 = require("../mail/mail.service");
const crypto = __importStar(require("crypto"));
const common_2 = require("@nestjs/common");
let AuthService = class AuthService {
    constructor(usersService, jwtService, config, mailService) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.config = config;
        this.mailService = mailService;
    }
    async signTokens(user) {
        const payload = { sub: user.id, email: user.email };
        const accessToken = await this.jwtService.signAsync(payload, {
            secret: this.config.get('JWT_ACCESS_SECRET'),
            expiresIn: this.config.get('JWT_ACCESS_TTL') || '15m',
        });
        const refreshToken = await this.jwtService.signAsync(payload, {
            secret: this.config.get('JWT_REFRESH_SECRET'),
            expiresIn: this.config.get('JWT_REFRESH_TTL') || '7d',
        });
        return { accessToken, refreshToken };
    }
    async setRefreshToken(userId, refreshToken) {
        const hash = await bcrypt.hash(refreshToken, 10);
        await this.usersService.updateRefreshToken(userId, hash);
        const user = await this.usersService.findById(userId);
        if (user && !user.refreshTokenIssuedAt) {
            await this.usersService.setRefreshTokenIssuedAt(userId, new Date());
        }
    }
    async signup(name, email, password) {
        // ------------------- 1️⃣ Basic required field checks -------------------
        if (!name?.trim())
            throw new common_1.BadRequestException('Name is required');
        if (!email?.trim())
            throw new common_1.BadRequestException('Email is required');
        if (!password?.trim())
            throw new common_1.BadRequestException('Password is required');
        // ------------------- 2️⃣ Email format validation -------------------
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email))
            throw new common_1.BadRequestException('Invalid email format');
        // ------------------- 3️⃣ Password strength validation -------------------
        if (password.length < 8) {
            throw new common_1.BadRequestException('Password must be at least 8 characters long');
        }
        if (!/[A-Z]/.test(password)) {
            throw new common_1.BadRequestException('Password must contain at least one uppercase letter');
        }
        if (!/[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/.test(password)) {
            throw new common_1.BadRequestException('Password must contain at least one special character');
        }
        // ------------------- 4️⃣ Check for existing user -------------------
        const exists = await this.usersService.findByEmail(email);
        if (exists)
            throw new common_1.ConflictException('Email already registered');
        // ------------------- 5️⃣ Create user -------------------
        const hashed = await bcrypt.hash(password, 10);
        const user = await this.usersService.createUser(name, email, hashed);
        // // ------------------- 6️⃣ Sign JWT tokens -------------------
        // const tokens = await this.signTokens(user);
        // await this.setRefreshToken(user.id, tokens.refreshToken);
        //const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
        const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
        await this.usersService.saveOtp(user.id, otp, 10); // expires in 10 minutes
        await this.mailService.sendOtpEmail(user.email, user.name, otp);
        return {
            message: 'User created successfully',
            user: { id: user.id, email: user.email, name: user.name },
        };
    }
    async verifyEmailOtp(email, otp) {
        // 1. Find user
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.BadRequestException('User not found');
        }
        // 2. If already verified
        if (user.isVerified) {
            throw new common_1.BadRequestException('User already verified');
        }
        // 3. Verify OTP via UsersService
        const otpOk = await this.usersService.verifyOtp(user.id, otp);
        if (!otpOk) {
            throw new common_1.BadRequestException('Invalid or expired OTP');
        }
        // 4. Mark user as verified
        await this.usersService.markEmailVerified(user.id);
        // 5. Re-fetch user
        const verifiedUser = await this.usersService.findById(user.id);
        if (!verifiedUser) {
            throw new common_1.BadRequestException('User not found after verification');
        }
        // 6. Create tokens
        const tokens = await this.signTokens(verifiedUser);
        await this.setRefreshToken(verifiedUser.id, tokens.refreshToken);
        // 7. Return tokens + user info
        return {
            message: 'Email verified successfully',
            user: {
                id: verifiedUser.id,
                email: verifiedUser.email,
                name: verifiedUser.name,
                isEmailVerified: verifiedUser.isVerified,
            },
            ...tokens,
        };
    }
    async resendOtp(email) {
        // 1. Find user
        const user = await this.usersService.findByEmail(email);
        if (!user)
            throw new common_1.BadRequestException('User not found');
        if (user.isVerified) {
            throw new common_1.BadRequestException('User is already verified');
        }
        try {
            // 2. Generate new OTP
            const otp = Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
            console.log(`Generated OTP for ${email}: ${otp}`);
            // 3. Save OTP in DB with expiry
            const saved = await this.usersService.saveOtp(user.id, otp, 10); // expires in 10 mins
            console.log(`OTP saved for user ${user.id}:`, saved);
            // 4. Send OTP email
            await this.mailService.sendOtpEmail(user.email, user.name, otp);
            console.log(`OTP email sent successfully to ${user.email}`);
            return { message: 'OTP resent successfully' };
        }
        catch (err) {
            console.error('Error resending OTP:', err);
            throw new common_2.InternalServerErrorException('Failed to resend OTP');
        }
    }
    async login(email, password) {
        // ------------------- 1️⃣ Basic required field checks -------------------
        if (!email?.trim())
            throw new common_1.BadRequestException('Email is required');
        if (!password?.trim())
            throw new common_1.BadRequestException('Password is required');
        // ------------------- 2️⃣ Email format validation -------------------
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email))
            throw new common_1.BadRequestException('Invalid email format');
        // ------------------- 3️⃣ Find user -------------------
        const user = await this.usersService.findByEmail(email);
        if (!user) {
            throw new common_1.UnauthorizedException('Email not registered');
        }
        // ------------------- 4️⃣ Check password -------------------
        if (!user.password) {
            throw new common_1.UnauthorizedException('User has no password set');
        }
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            throw new common_1.UnauthorizedException('Invalid password');
        }
        if (!user.isVerified) {
            throw new common_1.UnauthorizedException('Email not verified. Please verify your email before logging in.');
        }
        // ------------------- 5️⃣ Sign JWT tokens -------------------
        const tokens = await this.signTokens(user);
        await this.setRefreshToken(user.id, tokens.refreshToken);
        await this.usersService.setRefreshTokenIssuedAt(user.id, new Date());
        await this.usersService.updateUser(user.id, { isLoggedin: true });
        return {
            message: 'Login successful',
            user: { id: user.id, email: user.email, name: user.name, isLoggedin: true },
            ...tokens,
        };
    }
    // extra helper if you need to call it from controller
    async findUserByEmail(email) {
        return this.usersService.findByEmail(email);
    }
    async refreshTokens(userId, refreshToken) {
        const user = await this.usersService.findById(userId);
        if (!user || !user.refreshTokenHash)
            throw new common_1.UnauthorizedException('Access denied');
        // check max session duration
        const now = new Date();
        const sessionLimit = 15 * 24 * 60 * 60 * 1000; // 15 days
        if (!user.refreshTokenIssuedAt || user.refreshTokenIssuedAt.getTime() + sessionLimit < now.getTime()) {
            throw new common_1.UnauthorizedException('Session expired. Please log in again.');
        }
        const tokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
        if (!tokenMatches)
            throw new common_1.UnauthorizedException('Invalid refresh token');
        const tokens = await this.signTokens(user);
        await this.setRefreshToken(user.id, tokens.refreshToken);
        return {
            message: 'Tokens refreshed successfully',
            user: { id: user.id, email: user.email, name: user.name },
            ...tokens,
        };
    }
    async logout(userId) {
        const user = await this.usersService.findById(userId);
        if (!user)
            throw new common_1.UnauthorizedException('User not found');
        // Clear hashed refresh token
        user.refreshTokenHash = null;
        user.refreshTokenIssuedAt = null,
            await this.usersService.updateRefreshToken(userId, null);
        await this.usersService.updateUser(user.id, { isLoggedin: false });
        return { message: 'Logged out successfully' };
    }
    async googleAuth(profile) {
        let user = await this.usersService.findByEmail(profile.email);
        if (user) {
            // If user exists but Google ID is not set, link it
            if (!user.googleId) {
                user.googleId = profile.googleId;
                await this.usersService.updateUser(user.id, { googleId: profile.googleId, isLoggedin: true,
                    isVerified: true });
            }
        }
        else {
            // Create new user if email not in DB
            user = await this.usersService.createUser(profile.name, profile.email, null, profile.googleId);
        }
        await this.usersService.updateUser(user.id, { isVerified: true, isLoggedin: true });
        // Issue JWT access + refresh tokens
        const tokens = await this.signTokens(user);
        await this.setRefreshToken(user.id, tokens.refreshToken);
        return {
            message: 'Login successful',
            user: { id: user.id, email: user.email, name: user.name },
            ...tokens,
        };
    }
    async forgotPassword(email) {
        const user = await this.usersService.findByEmail(email);
        if (!user)
            throw new common_1.BadRequestException('User not found');
        const resetToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = await bcrypt.hash(resetToken, 10);
        user.resetTokenHash = hashedToken;
        user.resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);
        await this.usersService.save(user);
        const resetLink = `http://localhost:3000/reset-password?token=${resetToken}&email=${user.email}`;
        await this.mailService.sendResetPasswordEmail(user.email, resetLink, user.name);
        console.log(resetToken); // for testing
    }
    async resetPassword(email, token, newPassword) {
        const user = await this.usersService.findByEmail(email);
        if (!user)
            throw new common_1.BadRequestException('User not found');
        if (!user.resetTokenExpiry || user.resetTokenExpiry.getTime() < Date.now()) {
            throw new common_1.BadRequestException('Reset token expired');
        }
        const resetTokenHash = user.resetTokenHash;
        if (!resetTokenHash) {
            throw new common_1.BadRequestException('Invalid reset token'); // token missing
        }
        const isTokenValid = await bcrypt.compare(token, resetTokenHash);
        if (!isTokenValid)
            throw new common_1.BadRequestException('Invalid reset token');
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+{}[\]:;<>,.?~\\/-]).{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            throw new common_1.BadRequestException('Password must be at least 8 characters long, contain 1 uppercase letter, and 1 special character');
        }
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetTokenHash = null;
        user.resetTokenExpiry = null;
        await this.usersService.save(user);
        return { message: 'Password reset successfully' };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService,
        mail_service_1.MailService])
], AuthService);
