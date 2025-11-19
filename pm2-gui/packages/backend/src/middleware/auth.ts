import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = process.env.JWT_SECRET || 'pm2-gui-secret-key-change-in-production';
const TOKEN_EXPIRY = '24h';

interface User {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'viewer';
}

interface JWTPayload {
  userId: string;
  username: string;
  role: string;
}

// File-based user storage
const USERS_FILE = path.join(__dirname, '../../data/users.json');

// Ensure data directory exists
const dataDir = path.dirname(USERS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize with default admin user if no users exist
function getUsers(): User[] {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      // Create default admin user
      const defaultUser: User = {
        id: '1',
        username: 'admin',
        passwordHash: bcrypt.hashSync('admin123', 10),
        role: 'admin',
      };
      fs.writeFileSync(USERS_FILE, JSON.stringify([defaultUser], null, 2));
      return [defaultUser];
    }
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveUsers(users: User[]): void {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Authentication middleware
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Skip auth for login endpoint
  if (req.path === '/api/auth/login' || req.path === '/api/health') {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
    (req as Request & { user: JWTPayload }).user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Admin authorization middleware
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  // Skip admin check if auth is disabled
  const AUTH_ENABLED = process.env['AUTH_ENABLED'] !== 'false';
  if (!AUTH_ENABLED) {
    next();
    return;
  }

  const user = (req as Request & { user: JWTPayload }).user;

  if (!user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }

  if (user.role !== 'admin') {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }

  next();
}

// Login handler
export async function login(username: string, password: string): Promise<{ token: string; user: Omit<User, 'passwordHash'> } | null> {
  const users = getUsers();
  const user = users.find((u) => u.username === username);

  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  const token = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );

  return {
    token,
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  };
}

// Change password
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  const users = getUsers();
  const userIndex = users.findIndex((u) => u.id === userId);

  if (userIndex === -1) {
    return false;
  }

  const isValid = await bcrypt.compare(currentPassword, users[userIndex].passwordHash);
  if (!isValid) {
    return false;
  }

  users[userIndex].passwordHash = await bcrypt.hash(newPassword, 10);
  saveUsers(users);
  return true;
}

// Get current user
export function getCurrentUser(userId: string): Omit<User, 'passwordHash'> | null {
  const users = getUsers();
  const user = users.find((u) => u.id === userId);
  if (!user) return null;

  return {
    id: user.id,
    username: user.username,
    role: user.role,
  };
}

export { JWTPayload };
