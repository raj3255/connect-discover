/**
 * Auth Routes
 * Handles user authentication: login, register, logout, email verification, password reset
 * 
 * Database: PostgreSQL
 * Cache: Redis (sessions, tokens)
 * 
 * SQL Schema:
 * CREATE TABLE users (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   email VARCHAR(255) UNIQUE NOT NULL,
 *   password_hash VARCHAR(255) NOT NULL,
 *   name VARCHAR(100) NOT NULL,
 *   age INTEGER NOT NULL,
 *   gender VARCHAR(20) NOT NULL,
 *   avatar_url TEXT,
 *   email_verified BOOLEAN DEFAULT FALSE,
 *   created_at TIMESTAMP DEFAULT NOW(),
 *   updated_at TIMESTAMP DEFAULT NOW()
 * );
 * 
 * CREATE TABLE email_verifications (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES users(id) ON DELETE CASCADE,
 *   code VARCHAR(6) NOT NULL,
 *   expires_at TIMESTAMP NOT NULL,
 *   created_at TIMESTAMP DEFAULT NOW()
 * );
 * 
 * CREATE TABLE password_resets (
 *   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *   user_id UUID REFERENCES users(id) ON DELETE CASCADE,
 *   token VARCHAR(255) NOT NULL,
 *   expires_at TIMESTAMP NOT NULL,
 *   used BOOLEAN DEFAULT FALSE,
 *   created_at TIMESTAMP DEFAULT NOW()
 * );
 * 
 * Redis Keys:
 * - session:{userId} -> session data (TTL: 7 days)
 * - refresh:{token} -> userId (TTL: 30 days)
 * - rate_limit:auth:{ip} -> attempt count (TTL: 15 min)
 */

// ============================================
// REQUEST TYPES
// ============================================

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  age: number;
  gender: 'male' | 'female' | 'other';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface VerifyEmailRequest {
  code: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ============================================
// RESPONSE TYPES
// ============================================

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  avatar_url: string | null;
  email_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface TokenRefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface MessageResponse {
  message: string;
}

// ============================================
// ROUTE DEFINITIONS
// ============================================

/**
 * POST /auth/register
 * Register a new user account
 * 
 * Body: RegisterRequest
 * Response: { message: string, user: AuthUser }
 * 
 * Steps:
 * 1. Validate input (email format, password strength, age >= 18)
 * 2. Check if email already exists in PostgreSQL
 * 3. Hash password with bcrypt (cost factor 12)
 * 4. Create user in users table
 * 5. Generate 6-digit verification code
 * 6. Store code in email_verifications table (expires in 10 min)
 * 7. Send verification email
 * 8. Return user data (without tokens until email verified)
 */

/**
 * POST /auth/login
 * Authenticate user and return tokens
 * 
 * Body: LoginRequest
 * Response: AuthResponse
 * 
 * Steps:
 * 1. Rate limit check via Redis (max 5 attempts per 15 min per IP)
 * 2. Find user by email in PostgreSQL
 * 3. Verify password with bcrypt.compare()
 * 4. Check if email is verified
 * 5. Generate JWT access token (expires in 15 min)
 * 6. Generate refresh token (expires in 30 days)
 * 7. Store session in Redis with user data
 * 8. Update last_login timestamp in users table
 * 9. Return tokens and user data
 */

/**
 * POST /auth/logout
 * Invalidate user session
 * 
 * Headers: Authorization: Bearer {accessToken}
 * Response: MessageResponse
 * 
 * Steps:
 * 1. Extract user ID from JWT
 * 2. Delete session from Redis (session:{userId})
 * 3. Add refresh token to blacklist in Redis
 * 4. Return success message
 */

/**
 * POST /auth/verify-email
 * Verify email with 6-digit code
 * 
 * Headers: Authorization: Bearer {accessToken}
 * Body: VerifyEmailRequest
 * Response: MessageResponse
 * 
 * Steps:
 * 1. Extract user ID from JWT
 * 2. Find code in email_verifications table
 * 3. Check if code matches and is not expired
 * 4. Update email_verified = true in users table
 * 5. Delete verification record
 * 6. Return success message
 */

/**
 * POST /auth/resend-verification
 * Resend verification email
 * 
 * Headers: Authorization: Bearer {accessToken}
 * Response: MessageResponse
 * 
 * Steps:
 * 1. Extract user ID from JWT
 * 2. Rate limit check (max 3 per hour)
 * 3. Delete existing verification codes for user
 * 4. Generate new 6-digit code
 * 5. Store in email_verifications table
 * 6. Send verification email
 * 7. Return success message
 */

/**
 * POST /auth/forgot-password
 * Request password reset email
 * 
 * Body: ForgotPasswordRequest
 * Response: MessageResponse
 * 
 * Steps:
 * 1. Find user by email (don't reveal if not found)
 * 2. Generate secure reset token (UUID or crypto.randomBytes)
 * 3. Store token in password_resets table (expires in 1 hour)
 * 4. Send email with reset link containing token
 * 5. Always return success message (security)
 */

/**
 * POST /auth/reset-password
 * Reset password using token from email
 * 
 * Body: ResetPasswordRequest
 * Response: MessageResponse
 * 
 * Steps:
 * 1. Find token in password_resets table
 * 2. Check if token is valid, not expired, not used
 * 3. Validate new password strength
 * 4. Hash new password with bcrypt
 * 5. Update password in users table
 * 6. Mark token as used
 * 7. Invalidate all existing sessions in Redis
 * 8. Return success message
 */

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 * 
 * Body: RefreshTokenRequest
 * Response: TokenRefreshResponse
 * 
 * Steps:
 * 1. Verify refresh token signature
 * 2. Check if token is blacklisted in Redis
 * 3. Find user in PostgreSQL
 * 4. Generate new access token
 * 5. Optionally rotate refresh token
 * 6. Return new tokens
 */

/**
 * GET /auth/me
 * Get current authenticated user
 * 
 * Headers: Authorization: Bearer {accessToken}
 * Response: AuthUser
 * 
 * Steps:
 * 1. Extract user ID from JWT
 * 2. Fetch user from PostgreSQL
 * 3. Return user data (exclude password_hash)
 */

/**
 * POST /auth/change-password
 * Change password for authenticated user
 * 
 * Headers: Authorization: Bearer {accessToken}
 * Body: ChangePasswordRequest
 * Response: MessageResponse
 * 
 * Steps:
 * 1. Extract user ID from JWT
 * 2. Verify current password
 * 3. Validate new password strength
 * 4. Hash new password
 * 5. Update in users table
 * 6. Optionally invalidate other sessions
 * 7. Return success message
 */

/**
 * DELETE /auth/account
 * Delete user account permanently
 * 
 * Headers: Authorization: Bearer {accessToken}
 * Body: { password: string } (confirmation)
 * Response: MessageResponse
 * 
 * Steps:
 * 1. Extract user ID from JWT
 * 2. Verify password for confirmation
 * 3. Delete user from PostgreSQL (cascades to related tables)
 * 4. Remove all sessions from Redis
 * 5. Delete user files from storage
 * 6. Return success message
 */
