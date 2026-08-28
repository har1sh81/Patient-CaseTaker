import crypto from 'crypto';

const SECRET_KEY = crypto.createHash('sha256').update(process.env.JWT_SECRET || 'fallback-secret-for-demo-purposes').digest();
const IV_LENGTH = 16;

interface TokenPayload {
  sessionId: string;
  expiresAt: number;
}

export function generateUploadToken(sessionId: string, expiresInMs: number = 10 * 60 * 1000): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', SECRET_KEY, iv);
  
  const payload: TokenPayload = {
    sessionId,
    expiresAt: Date.now() + expiresInMs,
  };
  
  let encrypted = cipher.update(JSON.stringify(payload), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Return iv and encrypted data separated by a colon
  return `${iv.toString('hex')}:${encrypted}`;
}

export function verifyUploadToken(token: string): string | null {
  try {
    const parts = token.split(':');
    if (parts.length !== 2) return null;
    
    const [ivHex, encryptedHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', SECRET_KEY, iv);
    
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    const payload: TokenPayload = JSON.parse(decrypted);
    
    if (Date.now() > payload.expiresAt) {
      return null; // Token expired
    }
    
    return payload.sessionId;
  } catch {
    // Fails on decryption error, invalid format, parsing error, etc.
    return null;
  }
}
