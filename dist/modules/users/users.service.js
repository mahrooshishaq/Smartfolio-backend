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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./user.entity");
const bcrypt = __importStar(require("bcrypt"));
let UsersService = class UsersService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async createUser(name, email, password, googleId) {
        const user = this.userRepository.create({
            name,
            email,
            password,
            googleId: googleId ?? null,
        });
        return this.userRepository.save(user);
    }
    async findByGoogleId(googleId) {
        return this.userRepository.findOne({ where: { googleId } });
    }
    async findByEmail(email) {
        return this.userRepository.findOne({ where: { email } });
    }
    async findById(id) {
        return this.userRepository.findOne({ where: { id } });
    }
    async updateRefreshToken(userId, refreshTokenHash) {
        await this.userRepository.update({ id: userId }, {
            refreshTokenHash,
            refreshTokenIssuedAt: refreshTokenHash ? new Date() : null, // set null when logging out
        });
    }
    async saveOtp(userId, otp, expiryMinutes) {
        const salt = await bcrypt.genSalt();
        const otpHash = await bcrypt.hash(otp, salt);
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + expiryMinutes);
        await this.userRepository.update(userId, {
            otpHash,
            otpExpiry: expiry,
        });
    }
    async verifyOtp(userId, otp) {
        const user = await this.findById(userId);
        if (!user || !user.otpHash || !user.otpExpiry)
            return false;
        const now = new Date();
        if (user.otpExpiry < now) { // OTP expired — clear it from DB
            await this.userRepository.update(userId, {
                otpHash: null,
                otpExpiry: null,
            });
            return false; // expired
        }
        const isMatch = await bcrypt.compare(otp, user.otpHash);
        if (!isMatch)
            return false;
        // OTP is correct — clear it
        await this.userRepository.update(userId, {
            otpHash: null,
            otpExpiry: null,
        });
        return true;
    }
    // Mark email verified
    async markEmailVerified(userId) {
        await this.userRepository.update(userId, { isVerified: true, otpHash: null,
            otpExpiry: null });
    }
    async setRefreshTokenIssuedAt(userId, date) {
        await this.userRepository.update(userId, { refreshTokenIssuedAt: date });
    }
    async updateUser(userId, updateData) {
        const user = await this.findById(userId);
        if (!user)
            throw new Error('User not found');
        Object.assign(user, updateData); // updates only the fields you pass
        return this.userRepository.save(user); // or .update depending on your setup
    }
    async save(user) {
        return this.userRepository.save(user);
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UsersService);
