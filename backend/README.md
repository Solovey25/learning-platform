# Educational Platform Backend

This is the backend API for the Educational Platform, built with FastAPI and PostgreSQL.

## Setup

### Prerequisites
- Python 3.8+
- PostgreSQL
- Docker and Docker Compose (optional)

### Environment Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate
```

On Windows use:
```bash
venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up environment variables:
```bash
export DATABASE_URL=postgresql://postgres:postgres@localhost/eduplatform
export SECRET_KEY=your_secret_key_here
```

### Database Setup

1. Create a PostgreSQL database:
```bash
createdb eduplatform
```

2. Run the application to create tables:
```bash
python main.py
```

### Using Docker

Alternatively, you can use Docker Compose:

```bash
docker-compose up -d
```

## API Documentation

Once the server is running, you can access the API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## API Endpoints

### Authentication
- POST /auth/register - Register a new user
- POST /auth/login - Login and get access token
- GET /auth/me - Get current user info

### Courses
- GET /courses - Get all courses
- GET /courses/user - Get user's courses with progress
- GET /courses/{course_id} - Get a specific course
- GET /courses/{course_id}/chapters/{chapter_id} - Get a specific chapter
- POST /courses/{course_id}/chapters/{chapter_id}/complete - Mark a chapter as completed
- POST /courses/{course_id}/chapters/{chapter_id}/quiz - Submit quiz answers

### Admin
- POST /admin/courses - Create a new course
- PUT /admin/courses/{course_id} - Update a course
- DELETE /admin/courses/{course_id} - Delete a course
