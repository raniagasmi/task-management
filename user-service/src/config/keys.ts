
import * as dotenv from 'dotenv'; 

dotenv.config(); 



export const keys = {
    mongoURI: process.env.MONGO_URI || 'error',
    jwtSecret: process.env.JWT_SECRET || 'error',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || 'error',
    bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 10,
    frontendResetPasswordUrl:
        process.env.FRONTEND_RESET_PASSWORD_URL || 'http://localhost:5173/reset-password',
    mailtrapHost: process.env.MAILTRAP_HOST || 'sandbox.smtp.mailtrap.io',
    mailtrapPort: Number(process.env.MAILTRAP_PORT) || 2525,
    mailtrapUser: process.env.MAILTRAP_USER || '0d9064baeabe14',
    mailtrapPass: process.env.MAILTRAP_PASS || 'd45cc0f4657ea0',
    mailFrom: process.env.MAIL_FROM || 'Flexity <no-reply@flexity.local>',
};
