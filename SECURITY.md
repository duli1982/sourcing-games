# Security Implementation

This document outlines the security measures implemented in the Sourcing AI Games platform.

## Authentication & Session Management

### Session Tokens (Players)
- **Storage**: httpOnly cookies with `SameSite=Strict` and `Secure` flags
- **Lifetime**: 1 year
- **Protection**: Tokens are never accessible to client-side JavaScript, preventing XSS attacks
- **Implementation**:
  - Server sets cookie via `/api/session-token`
  - Token returned once for database storage only
  - All subsequent requests automatically send cookie
  - Client code never stores tokens in localStorage

### Admin Tokens
- **Storage**: httpOnly cookies with `SameSite=Strict` and `Secure` flags
- **Lifetime**: 24 hours
- **Protection**: Admin credentials never stored client-side
- **Implementation**:
  - Login endpoint: `/api/admin/login`
  - Logout endpoint: `/api/admin/logout`
  - Token validated against `ADMIN_DASH_TOKEN` environment variable
  - All admin APIs read from cookies, not headers

## CSRF Protection

### SameSite Cookies
- All cookies use `SameSite=Strict` flag
- Prevents cookies from being sent with cross-site requests
- Protects against CSRF attacks without requiring CSRF tokens

### Additional Measures
- Origin validation on sensitive endpoints
- Admin actions require authentication via httpOnly cookies

## Rate Limiting

### Game Submissions
- **Endpoint**: `/api/submitAttempt`
- **Limit**: 30-second cooldown between submissions per player
- **Implementation**: Timestamp check on player's last attempt
- **Protection**: Prevents API spam and abuse

### Future Enhancements
- Add rate limiting to team creation (5/hour)
- Add rate limiting to admin actions (configurable)
- Consider Upstash Redis for distributed rate limiting in production

## Input Validation

### Player Creation
- Name validation: alphanumeric, hyphens, underscores only
- Length limits enforced
- Duplicate name prevention

### Team Creation
- Team name validation (2-50 characters)
- Invite code format validation (XXXX-XXXX)
- Member limit enforcement (max 50)

### Game Submissions
- Submission length limit: 10,000 characters
- Input sanitization for AI prompts
- Validation result schemas enforced

## Database Security

### Supabase Configuration
- Service role key stored in environment variables only
- Row-level security policies on sensitive tables
- Prepared statements prevent SQL injection

### Data Privacy
- Profile visibility controls (public/private)
- Session tokens stored as hashed values in database
- Admin events logged for audit trail

## API Security

### Authentication
- All protected endpoints validate httpOnly cookies
- 401 responses trigger client-side re-authentication
- Session expiry handling on client and server

### Error Handling
- Generic error messages to prevent information disclosure
- Detailed errors only in development mode
- Stack traces hidden in production

## Environment Variables

### Required Variables
- `SUPABASE_URL` - Database connection URL
- `SUPABASE_SERVICE_ROLE_KEY` - Database service key
- `ADMIN_DASH_TOKEN` - Admin authentication token
- `GEMINI_API_KEY` - AI scoring API key

### Security Best Practices
- Never commit `.env` files
- Rotate tokens regularly
- Use different tokens for dev/staging/production
- Store secrets in Vercel environment variables

## Security Checklist

- [x] Session tokens in httpOnly cookies
- [x] Admin tokens in httpOnly cookies
- [x] SameSite=Strict on all cookies
- [x] Secure flag on cookies in production
- [x] Rate limiting on submission endpoint
- [x] Input validation on all endpoints
- [x] SQL injection prevention (prepared statements)
- [x] XSS prevention (cookie-based auth)
- [ ] Content Security Policy headers
- [ ] Distributed rate limiting (Upstash Redis)
- [ ] Audit logging for sensitive operations
- [ ] Automated security scanning

## Reporting Security Issues

If you discover a security vulnerability, please email security@example.com (replace with actual contact).

Do NOT open public issues for security vulnerabilities.

---

**Last Updated**: December 18, 2025
**Security Review**: Pending external audit
