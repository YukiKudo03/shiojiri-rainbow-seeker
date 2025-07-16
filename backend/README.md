# Shiojiri Rainbow Seeker Backend API

## Overview
Backend API server for the Shiojiri Rainbow Seeker project, built with Node.js and Express.

## Setup

### Prerequisites
- Node.js 16+ 
- PostgreSQL database
- Firebase project (for push notifications)
- Weather API key (OpenWeatherMap)

### Installation
```bash
npm install
```

### Environment Configuration
Copy `.env.example` to `.env` and configure the following variables:

```env
# Server
PORT=3000
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shiojiri_rainbow
DB_USER=your_username
DB_PASSWORD=your_password

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d

# Weather API
WEATHER_API_KEY=your-openweather-api-key
WEATHER_API_URL=https://api.openweathermap.org/data/2.5

# Firebase (Push Notifications)
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email
```

### Database Setup
```bash
# Create database schema
psql -U your_username -d shiojiri_rainbow -f src/config/schema.sql
```

### Running the Server
```bash
# Development
npm run dev

# Production
npm start

# Tests
npm test
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)
- `PUT /api/auth/me` - Update current user (requires auth)

### Rainbow Sightings
- `GET /api/rainbow` - Get all rainbow sightings
- `POST /api/rainbow` - Create rainbow sighting (requires auth)
- `GET /api/rainbow/:id` - Get specific rainbow sighting
- `PUT /api/rainbow/:id` - Update rainbow sighting (requires auth)
- `DELETE /api/rainbow/:id` - Delete rainbow sighting (requires auth)
- `GET /api/rainbow/nearby/:lat/:lon` - Get nearby rainbow sightings

### Weather Data
- `GET /api/weather/current` - Get current weather
- `GET /api/weather/radar` - Get rain cloud radar data
- `GET /api/weather/history/:date` - Get historical weather
- `GET /api/weather/prediction` - Get rainbow prediction

### Notifications
- `POST /api/notification/register-token` - Register FCM token (requires auth)
- `POST /api/notification/send-rainbow-alert` - Send rainbow alert (requires auth)
- `GET /api/notification/history` - Get notification history (requires auth)

## Request Examples

### Register User
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "Password123!"
  }'
```

### Create Rainbow Sighting
```bash
curl -X POST http://localhost:3000/api/rainbow \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "latitude": 36.1127,
    "longitude": 137.9545,
    "description": "Beautiful rainbow after rain"
  }'
```

### Upload Rainbow Image
```bash
curl -X POST http://localhost:3000/api/rainbow \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "latitude=36.1127" \
  -F "longitude=137.9545" \
  -F "description=Rainbow with image" \
  -F "image=@rainbow.jpg"
```

### Get Nearby Rainbows
```bash
curl "http://localhost:3000/api/rainbow/nearby/36.1127/137.9545?radius=10"
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "id": 1,
    "latitude": 36.1127,
    "longitude": 137.9545,
    "description": "Beautiful rainbow",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      {
        "field": "latitude",
        "message": "Latitude must be between -90 and 90"
      }
    ]
  }
}
```

## File Upload
- Maximum file size: 5MB
- Supported formats: JPEG, PNG, GIF
- Files are stored in `uploads/` directory
- Images are automatically validated and processed

## Rate Limiting
- 100 requests per 15 minutes per IP
- Authentication endpoints have stricter limits
- Upload endpoints have reduced limits

## Security Features
- JWT authentication
- Password hashing with bcrypt
- Input validation and sanitization
- CORS protection
- Helmet security headers
- Rate limiting
- File upload validation

## Database Schema
See `src/config/schema.sql` for complete database schema with:
- Users table
- Rainbow sightings table
- Weather data table
- Notifications table
- Machine learning predictions table

## Error Handling
The API includes comprehensive error handling for:
- Validation errors
- Authentication errors
- Database errors
- File upload errors
- Rate limit errors

## Testing
```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/rainbow.test.js

# Run tests with coverage
npm run test:coverage
```

## Project Structure
```
src/
├── config/          # Database and app configuration
├── controllers/     # Request handlers
├── models/          # Database models
├── routes/          # API routes
├── middleware/      # Custom middleware
├── services/        # Business logic services
├── utils/           # Helper functions
└── server.js        # Main server file
```

## Contributing
1. Follow existing code style
2. Add tests for new features
3. Update documentation
4. Ensure all tests pass

## Health Check
The API includes a health check endpoint:
```
GET /health
```

Returns server status and timestamp.