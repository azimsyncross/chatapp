
## Authentication Methods

The application supports three authentication methods:

### 1. Email/Password Authentication
- Used by Admin and Moderators
- Regular users get temporary password on registration

### 2. Google OAuth
- Available only for regular users
- Not available for Admin/Moderator accounts

### 3. Code-based Authentication
- One-time codes sent via email
- Valid for 10 minutes

## User Roles

### 1. Admin
- Single admin in the system
- First registered user becomes admin
- Can create moderators
- Can reset moderator passwords
- Can view login history of all users

### 2. Moderator
- Created only by admin
- Has password-based authentication
- Gets default password on creation (12345678Aa@)
- Must change password after first login

### 3. Regular User
- Can self-register
- Can use Google OAuth
- Can use code-based login
- Gets default password if using regular registration

## API Endpoints

### Authentication Routes

#### Register User

```
http
POST /auth/register
Content-Type: application/json
{
"name": "John Doe",
"email": "john@example.com",
"phone": "1234567890",
"password": "password123" // Optional for regular users
}
Response: {
"success": true,
"message": "Registration successful",
"data": {
"user": {...},
"token": "jwt_token"
}
}
```


#### Login (Email/Password)

http
POST /auth/login
Content-Type: application/json
{
"email": "john@example.com",
"password": "password123"
}
Response: {
"success": true,
"message": "Login successful",
"data": {
"user": {...},
"token": "jwt_token"
}
}
http
POST /auth/login/code/request
Content-Type: application/json
{
"email": "john@example.com"
}
Response: {
"success": true,
"message": "Login code sent successfully"
}
http
POST /auth/login/code/verify
Content-Type: application/json
{
"email": "john@example.com",
"code": "123456"
}
Response: {
"success": true,
"message": "Code verification successful",
"data": {
"user": {...},
"token": "jwt_token"
}
}
http
GET /auth/google
GET /auth/google/callback
http
POST /password/change
Authorization: Bearer <token>
Content-Type: application/json
{
"currentPassword": "old_password",
"newPassword": "new_password"
}
http
POST /password/forgot
Content-Type: application/json
{
"email": "user@example.com"
}
http
POST /password/reset
Content-Type: application/json
{
"email": "user@example.com",
"resetCode": "123456",
"newPassword": "new_password"
}
http
POST /password/admin/forgot
Content-Type: application/json
{
"email": "admin@example.com"
}
http
POST /password/admin/reset
Content-Type: application/json
{
"email": "admin@example.com",
"resetCode": "123456",
"newPassword": "new_password"
}
http
POST /password/moderator/:moderatorId/reset
Authorization: Bearer <admin_token>
http
GET /users/me
Authorization: Bearer <token>
http
GET /users/login-history?userId=<optional_user_id>
Authorization: Bearer <admin_token>
http
POST /auth/moderator
Authorization: Bearer <admin_token>
Content-Type: application/json
{
"name": "Mod Name",
"email": "mod@example.com",
"phone": "1234567890"
}
json
{
"success": false,
"message": "Error message",
"errors": null | [error_details]
}
env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/your_database
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=1d
NODE_ENV=development
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=465
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-specific-password
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback


2. Install dependencies:
bash
npm install

3. Start the server:
bash
npm start


## Security Features

1. Password Security:
   - Passwords are hashed using bcrypt
   - Temporary passwords must be changed on first login
   - Password reset codes expire after 10 minutes

2. Authentication:
   - JWT-based authentication
   - Token expiry configurable via JWT_EXPIRES_IN
   - Google OAuth for regular users

3. Authorization:
   - Role-based access control
   - Protected routes using middleware
   - Hierarchical permission system

4. Login Tracking:
   - Tracks login history with IP and user agent
   - Tracks login method used
   - Timestamps for all login activities

## Best Practices

1. Always use HTTPS in production
2. Set secure and appropriate JWT expiry times
3. Use strong passwords
4. Change default passwords immediately
5. Keep environment variables secure
6. Regular security audits of login history




This documentation provides a comprehensive guide for developers to understand and implement the authentication system.