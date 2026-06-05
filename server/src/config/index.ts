import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/study-companion',
  jwtSecret: process.env.JWT_SECRET || 'change-this-to-a-secure-secret-in-production',
  jwtExpiresIn: '7d',
  vapid: {
    subject: process.env.VAPID_SUBJECT || 'mailto:admin@studycompanion.app',
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
  },
  groqApiKey: process.env.GROQ_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  aiProvider: (process.env.AI_PROVIDER || 'groq') as 'groq' | 'gemini',
  uploadDir: process.env.UPLOAD_DIR || './uploads',
};
