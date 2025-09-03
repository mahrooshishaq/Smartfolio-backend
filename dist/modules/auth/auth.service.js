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
let AuthService = class AuthService {
    constructor(usersService, jwtService, config) {
        this.usersService = usersService;
        this.jwtService = jwtService;
        this.config = config;
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
        // ------------------- 6️⃣ Sign JWT tokens -------------------
        const tokens = await this.signTokens(user);
        await this.setRefreshToken(user.id, tokens.refreshToken);
        return {
            message: 'User created successfully',
            user: { id: user.id, email: user.email, name: user.name },
            ...tokens,
        };
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
        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            throw new common_1.UnauthorizedException('Invalid password');
        }
        // ------------------- 5️⃣ Sign JWT tokens -------------------
        const tokens = await this.signTokens(user);
        await this.setRefreshToken(user.id, tokens.refreshToken);
        return {
            message: 'Login successful',
            user: { id: user.id, email: user.email, name: user.name },
            ...tokens,
        };
    }
    // extra helper if you need to call it from controller
    async findUserByEmail(email) {
        return this.usersService.findByEmail(email);
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [users_service_1.UsersService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
