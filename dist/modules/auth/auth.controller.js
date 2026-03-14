"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AuthController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const signup_dto_1 = require("../../common/dto/signup.dto");
const login_dto_1 = require("../../common/dto/login.dto");
const swagger_1 = require("@nestjs/swagger");
const jwt_auth_guard_1 = require("./jwt-auth.guard");
const verify_otp_dto_1 = require("../../common/dto/verify-otp.dto");
const passport_1 = require("@nestjs/passport");
let AuthController = AuthController_1 = class AuthController {
    constructor(authService) {
        this.authService = authService;
        this.logger = new common_1.Logger(AuthController_1.name); // declare logger here
    }
    async signup(dto) {
        try {
            const { name, email, password } = dto;
            console.log('Signup email received:', email);
            // 1️⃣ Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                this.logger.warn(`Signup failed: Invalid email format: ${email}`);
                throw new common_1.BadRequestException('Invalid email format');
            }
            // 2️⃣ Password strength validation
            const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*()_+{}[\]:;<>,.?~\\/-]).{8,}$/;
            if (!passwordRegex.test(password)) {
                this.logger.warn(`Signup failed for email ${email}: Password does not meet strength requirements`);
                throw new common_1.BadRequestException('Password must be at least 8 characters long, contain 1 uppercase letter, and 1 special character');
            }
            // 3️⃣ Check if user already exists
            const existingUser = await this.authService.findUserByEmail(email);
            if (existingUser) {
                this.logger.warn(`Signup failed: Email already registered: ${email}`);
                throw new common_1.BadRequestException('Email already registered');
            }
            // 4️⃣ Create user
            const user = await this.authService.signup(name, email, password);
            this.logger.log(`User created successfully: ${email}`);
            return {
                message: 'User created successfully. Please check your email for the OTP to verify your account.',
                userId: user.user.id,
            };
        }
        catch (error) {
            if (error instanceof Error) {
                this.logger.error(`Signup failed for email ${dto.email}: ${error.message}`);
                throw error;
            }
            else {
                this.logger.error(`Signup failed for email ${dto.email}: Unknown error`);
                throw new common_1.BadRequestException('Signup failed due to unknown error');
            }
        }
    }
    async login(dto) {
        try {
            const { email, password } = dto;
            // Basic checks for empty email/password
            if (!email || !password) {
                this.logger.warn('Login failed: Email or password missing');
                throw new common_1.BadRequestException('Email and password are required');
            }
            const result = await this.authService.login(email, password);
            this.logger.log(`User logged in successfully: ${email}`);
            return result;
        }
        catch (error) {
            if (error instanceof Error) {
                this.logger.error(`Login failed for email ${dto.email}: ${error.message}`);
                throw error;
            }
            else {
                this.logger.error(`Login failed for email ${dto.email}: Unknown error`);
                throw new common_1.BadRequestException('Login failed due to unknown error');
            }
        }
    }
    async refresh(body) {
        const { userId, refreshToken } = body;
        return this.authService.refreshTokens(userId, refreshToken);
    }
    async logout(req) {
        const userId = req.user.id; // user comes from JWT guard
        await this.authService.logout(userId);
        return { message: 'Logged out successfully' };
    }
    async verifyOtp(verifyOtpDto) {
        return this.authService.verifyEmailOtp(verifyOtpDto.email, verifyOtpDto.otp);
    }
    async resendOtp(body) {
        return this.authService.resendOtp(body.email);
    }
    //Initiate Google Login
    async googleLogin(req) {
        // This will redirect user to Google for login
    }
    // 2. Google callback route
    async googleCallback(req, res) {
        const user = req.user;
        if (!user)
            throw new common_1.BadRequestException('Google login failed');
        return user; // user already has JWT + info from GoogleStrategy
    }
    async getMe(req) {
        const user = req.user;
        return {
            id: user.id,
            name: user.name,
            email: user.email,
            isEmailVerified: user.isVerified,
        };
    }
    async forgotPassword(body) {
        await this.authService.forgotPassword(body.email);
        return { message: 'Password reset link sent to email' };
    }
    async resetPassword(body) {
        return this.authService.resetPassword(body.email, body.token, body.newPassword);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, common_1.Post)('signup'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new user' }),
    (0, swagger_1.ApiBody)({
        description: 'Signup payload',
        type: signup_dto_1.SignupDto,
        examples: {
            valid: {
                summary: 'Valid input',
                value: { email: 'test@example.com', password: 'MyPass@123', name: 'John Doe' },
            },
            invalidEmail: {
                summary: 'Invalid email format',
                value: { email: 'testexample.com', password: 'MyPass@123', name: 'John Doe' },
            },
            invalidPassword: {
                summary: 'Invalid password (no uppercase/special char)',
                value: { email: 'test@example.com', password: 'mypassword', name: 'John Doe' },
            },
            bothInvalid: {
                summary: 'Both email and password invalid',
                value: { email: 'testexample.com', password: 'mypassword', name: 'John Doe' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 201,
        description: 'User created successfully',
        schema: {
            example: {
                message: 'User created successfully',
                user: { id: 'uuid', email: 'test@example.com', name: 'John Doe' },
                accessToken: 'jwt-access-token',
                refreshToken: 'jwt-refresh-token',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 400,
        description: 'Validation failed',
        schema: {
            example: {
                statusCode: 400,
                message: [
                    'Email must be valid',
                    'Password must contain at least 1 uppercase letter and 1 special character',
                ],
                error: 'Bad Request',
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [signup_dto_1.SignupDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "signup", null);
__decorate([
    (0, common_1.Post)('login'),
    (0, swagger_1.ApiOperation)({ summary: 'User Login' }),
    (0, swagger_1.ApiBody)({
        description: 'Login payload',
        type: login_dto_1.LoginDto,
        examples: {
            valid: {
                summary: 'Valid credentials',
                value: { email: 'test@example.com', password: 'MyPass@123' },
            },
            invalidEmail: {
                summary: 'Email not registered',
                value: { email: 'unknown@example.com', password: 'MyPass@123' },
            },
            invalidPassword: {
                summary: 'Wrong password',
                value: { email: 'test@example.com', password: 'wrongPass' },
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Login successful',
        schema: {
            example: {
                message: 'Login successful',
                user: { id: 'uuid', email: 'test@example.com', name: 'John Doe', isLoggedin: true },
                accessToken: 'jwt-access-token',
                refreshToken: 'jwt-refresh-token',
            },
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 401,
        description: 'Invalid credentials',
        schema: {
            example: {
                statusCode: 401,
                message: 'Invalid credentials',
                error: 'Unauthorized',
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('refresh'),
    (0, swagger_1.ApiOperation)({ summary: 'Refresh JWT tokens using refresh token' }),
    (0, swagger_1.ApiBody)({
        description: 'Refresh token payload',
        schema: {
            type: 'object',
            properties: {
                userId: { type: 'string', example: 'uuid-of-user' },
                refreshToken: { type: 'string', example: 'refresh-token-here' },
            },
            required: ['userId', 'refreshToken'],
        },
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Tokens refreshed successfully',
        schema: {
            example: {
                message: 'Tokens refreshed successfully',
                user: { id: 'uuid', email: 'test@example.com', name: 'John Doe' },
                accessToken: 'new-jwt-access-token',
                refreshToken: 'new-jwt-refresh-token',
            },
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Logout user and revoke refresh token' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, common_1.Post)('verify-otp'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify OTP sent to email' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                email: { type: 'string', example: 'johndoe@example.com' },
                otp: { type: 'string', example: '123456' },
            },
            required: ['email', 'otp'],
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_otp_dto_1.VerifyOtpDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyOtp", null);
__decorate([
    (0, common_1.Post)('resend-otp'),
    (0, swagger_1.ApiOperation)({ summary: 'Resend OTP to user email' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                email: { type: 'string', example: 'johndoe@example.com' },
            },
            required: ['email'],
        },
    }),
    (0, swagger_1.ApiOperation)({ summary: 'Resend OTP to user email' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resendOtp", null);
__decorate([
    (0, common_1.Get)('google'),
    (0, swagger_1.ApiExcludeEndpoint)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('google')),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleLogin", null);
__decorate([
    (0, common_1.Get)('google/callback'),
    (0, swagger_1.ApiExcludeEndpoint)(),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('google')),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "googleCallback", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({
        summary: 'Get current authenticated user',
        description: 'Returns the logged-in user\'s basic info. Call this immediately after login/verify-otp to get user details.',
    }),
    (0, swagger_1.ApiOkResponse)({
        description: 'Current user info',
        schema: {
            example: {
                id: 'c80d42ce-dfa3-41be-9676-599b58b93004',
                name: 'John Doe',
                email: 'john@example.com',
                isEmailVerified: true,
            },
        },
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getMe", null);
__decorate([
    (0, common_1.Post)('forgot-password'),
    (0, swagger_1.ApiOperation)({ summary: 'Send password reset link to user email' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                email: { type: 'string', example: 'user@example.com' },
            },
            required: ['email'],
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "forgotPassword", null);
__decorate([
    (0, common_1.Post)('reset-password'),
    (0, swagger_1.ApiOperation)({ summary: 'Reset password using token' }),
    (0, swagger_1.ApiBody)({
        schema: {
            type: 'object',
            properties: {
                email: { type: 'string', example: 'johndoe@example.com' },
                token: { type: 'string', example: 'reset-token-from-email' },
                newPassword: { type: 'string', example: 'NewPass@123' },
            },
            required: ['email', 'token', 'newPassword'],
        },
    }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
exports.AuthController = AuthController = AuthController_1 = __decorate([
    (0, swagger_1.ApiTags)('Auth'),
    (0, common_1.Controller)('auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
