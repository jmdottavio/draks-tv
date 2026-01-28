# Security Remediation Plan

This document outlines the implementation plan for addressing all security issues identified in the authentication system audit.

## Overview

**Total Issues:** 15+ findings across 6 security audits
**Scope:** OAuth flow, token encryption, API routes, database, environment configuration

---

## Phase 1: Critical OAuth Security (CSRF Protection)

### 1.1 Add OAuth State Parameter Generation

**Files to modify:**
- `src/app/api/auth/url/index.ts`

**Changes:**
- Generate cryptographically random state value (32 bytes, hex encoded)
- Include state in authorization URL parameters
- Return state to client for cookie storage (or store server-side)

### 1.2 Add OAuth State Validation in Callback

**Files to modify:**
- `src/app/api/auth/callback/index.ts`

**Changes:**
- Extract state parameter from callback URL
- Validate state matches expected value
- Handle OAuth error responses (`?error=access_denied`)
- Return proper error if state is missing or invalid

### 1.3 Create State Management Utility

**Files to create:**
- `src/shared/utils/oauth-state.ts`

**Implementation:**
- `generateState()` - creates random state value
- `createStateToken()` - creates signed/encrypted state with expiry
- `validateStateToken()` - verifies state token authenticity and expiry

---

## Phase 2: Token Encryption Hardening

### 2.1 Require Encryption Key or Auto-Generate

**Files to modify:**
- `src/shared/utils/token-encryption.ts`

**Changes:**
- Remove hardcoded default key fallback
- Auto-generate unique key on first run if not provided
- Store generated key in a secure location (separate from DB)
- Log warning when using auto-generated key

### 2.2 Use Random Salt Per Installation

**Files to modify:**
- `src/shared/utils/token-encryption.ts`

**Changes:**
- Generate random salt on first encryption
- Store salt in config file or prepend to encrypted data
- Update encryption format to include salt

### 2.3 Strengthen scrypt Parameters

**Files to modify:**
- `src/shared/utils/token-encryption.ts`

**Changes:**
- Explicitly set scrypt options: `{ N: 131072, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }`
- Add key caching to avoid repeated derivation

---

## Phase 3: Token Lifecycle Management

### 3.1 Track Token Expiration

**Files to modify:**
- `src/db/schema.ts`
- `src/features/auth/auth.repository.ts`
- `src/app/api/auth/callback/index.ts`

**Changes:**
- Add `expiresAt` column to auth table
- Store calculated expiration time from `expires_in`
- Create migration for schema change

### 3.2 Implement Token Revocation on Logout

**Files to modify:**
- `src/app/api/auth/logout/index.ts`
- `src/services/twitch-service.ts`

**Changes:**
- Add `revokeToken()` function to twitch-service
- Call Twitch revocation endpoint before clearing local tokens
- Handle revocation failures gracefully (still clear local tokens)

### 3.3 Proactive Token Refresh

**Files to modify:**
- `src/services/twitch-service.ts`
- `src/features/auth/auth.repository.ts`

**Changes:**
- Check token expiration before API calls
- Refresh proactively when within 5 minutes of expiry
- Avoid race conditions with mutex/lock

---

## Phase 4: API Route Protection

### 4.1 Create Authentication Middleware

**Files to create:**
- `src/shared/utils/require-auth.ts`

**Implementation:**
- Helper function to check authentication status
- Returns standardized 401 response if not authenticated
- Reusable across all protected routes

### 4.2 Protect Unprotected Endpoints

**Files to modify:**
- `src/app/api/favorites/index.ts`
- `src/app/api/favorites/toggle/$id/index.ts`
- `src/app/api/favorites/reorder/index.ts`
- `src/app/api/users/index.ts`
- `src/app/api/videos/index.ts`
- `src/app/api/watch/live/$channel/index.ts`
- `src/app/api/watch/vod/$id/index.ts`

**Changes:**
- Add authentication check at start of each handler
- Return 401 if not authenticated

### 4.3 Add Rate Limiting

**Files to create:**
- `src/shared/utils/rate-limiter.ts`

**Files to modify:**
- `src/app/api/auth/url/index.ts`
- `src/app/api/auth/callback/index.ts`
- `src/app/api/auth/logout/index.ts`

**Implementation:**
- In-memory rate limiter (sliding window)
- 10 requests per minute for auth endpoints
- 60 requests per minute for general API

---

## Phase 5: Database Security

### 5.1 Set Database File Permissions

**Files to modify:**
- `src/db/index.ts`

**Changes:**
- Set file permissions to 0600 after database creation
- Set directory permissions to 0700 for data folder
- Handle Windows vs Unix permission differences

### 5.2 Add Input Length Validation

**Files to modify:**
- `src/features/channels/channels.validators.ts`

**Changes:**
- Add maximum length constants
- Validate string lengths before database operations

---

## Phase 6: HTTP Security Headers

### 6.1 Add Security Headers Middleware

**Files to create:**
- `src/shared/utils/security-headers.ts`

**Files to modify:**
- `app.config.ts` or server entry point

**Headers to add:**
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' https://static-cdn.jtvnw.net data:
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), microphone=(), camera=()
```

---

## Phase 7: Error Handling & Logging

### 7.1 Sanitize Error Messages

**Files to modify:**
- `src/features/auth/auth.repository.ts`
- `src/features/channels/favorites.repository.ts`
- `src/features/sidebar/channel-last-seen.repository.ts`

**Changes:**
- Log detailed errors server-side
- Return generic messages to clients
- Create error logging utility

### 7.2 Remove Sensitive Console Logs

**Files to modify:**
- `src/features/auth/components/auth-section.tsx`

**Changes:**
- Remove or sanitize console.error statements
- Use proper error boundaries for React components

---

## Phase 8: Command Execution Safety

### 8.1 Use execFile Instead of exec

**Files to modify:**
- `src/services/streamlink-service.ts`

**Changes:**
- Replace `exec()` with `execFile()`
- Pass arguments as array instead of string concatenation
- Maintain existing sanitization as defense-in-depth

---

## Phase 9: Environment Configuration

### 9.1 Add Startup Validation

**Files to create:**
- `src/shared/utils/env-validation.ts`

**Files to modify:**
- Server entry point

**Changes:**
- Validate required environment variables on startup
- Fail fast with clear error messages
- Warn about insecure defaults

### 9.2 Update Environment Documentation

**Files to modify:**
- `.env.example`
- `CLAUDE.md`

**Changes:**
- Document all security-related variables
- Add warnings about production deployment
- Include key generation instructions

---

## Implementation Order

| Order | Phase | Priority | Estimated Changes |
|-------|-------|----------|-------------------|
| 1 | Phase 1 (OAuth CSRF) | CRITICAL | 3 files |
| 2 | Phase 2.1-2.3 (Encryption) | CRITICAL | 1 file |
| 3 | Phase 3.2 (Token Revocation) | HIGH | 2 files |
| 4 | Phase 4.1-4.2 (Route Protection) | HIGH | 8 files |
| 5 | Phase 5.1 (DB Permissions) | HIGH | 1 file |
| 6 | Phase 8 (execFile) | HIGH | 1 file |
| 7 | Phase 3.1, 3.3 (Token Lifecycle) | MEDIUM | 4 files |
| 8 | Phase 6 (Security Headers) | MEDIUM | 2 files |
| 9 | Phase 4.3 (Rate Limiting) | MEDIUM | 4 files |
| 10 | Phase 7 (Error Handling) | MEDIUM | 4 files |
| 12 | Phase 5.2 (Input Validation) | LOW | 1 file |
| 13 | Phase 9 (Env Config) | LOW | 3 files |

---

## Testing Plan

After each phase:
1. Verify existing functionality still works
2. Test new security features
3. Run TypeScript type checking
4. Manual testing of OAuth flow

### Test Cases for OAuth State:
- [ ] State is generated and included in auth URL
- [ ] Callback rejects requests without state
- [ ] Callback rejects requests with invalid state
- [ ] Callback accepts requests with valid state
- [ ] OAuth error responses are handled gracefully

### Test Cases for Token Encryption:
- [ ] New tokens are encrypted with new format
- [ ] App starts without TOKEN_ENCRYPTION_KEY (generates key)
- [ ] App starts with TOKEN_ENCRYPTION_KEY (uses provided key)
- [ ] Warning logged when using generated key

### Test Cases for Route Protection:
- [ ] Protected routes return 401 when not authenticated
- [ ] Protected routes work normally when authenticated
- [ ] Rate limiter blocks excessive requests

---

## Rollback Plan

If issues arise:
1. Each phase can be reverted independently via git
2. Database migrations include down migrations
3. Encryption format is simple and consistent

---

## Notes

- This is a local single-user application, so some enterprise-level security (like HSM key storage) is not applicable
- The goal is defense-in-depth appropriate for the threat model
- All changes maintain backwards compatibility where possible
