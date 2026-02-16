# Running Tests

## Local Development

To run tests locally:

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

## With Coverage

```bash
pytest tests/ --cov=app --cov-report=html --cov-report=term
```

## Test Structure

- `tests/test_auth.py` - Tests for registration and authentication
- `tests/test_courses.py` - Tests for courses, enrollment, and quizzes
- `tests/conftest.py` - Test fixtures and configuration

## Test Coverage

The tests cover:
- ✅ User registration
- ✅ User authentication (login)
- ✅ Course creation (admin)
- ✅ Course enrollment with code verification
- ✅ Enrollment code validation
- ✅ Quiz submission
- ✅ Getting list of courses
- ✅ Access control (unauthorized access)

## CI/CD

Tests run automatically on:
- Push to main/master/develop branches
- Pull requests to main/master/develop branches

The CI pipeline uses PostgreSQL for testing to match production environment.

