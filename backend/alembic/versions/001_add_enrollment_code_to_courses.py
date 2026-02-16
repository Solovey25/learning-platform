"""add enrollment_code to courses

Revision ID: 001_add_enrollment_code
Revises: 
Create Date: 2024-01-01 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
import random
import string


revision = '001_add_enrollment_code'
down_revision = '000_initial_schema'
branch_labels = None
depends_on = None


def generate_enrollment_code():
    """Generate a random 8-character enrollment code"""
    alphabet = string.ascii_uppercase + string.digits
    return ''.join(random.choice(alphabet) for _ in range(8))


def upgrade() -> None:
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    
    if 'courses' not in inspector.get_table_names():
        return
    
    columns = [col['name'] for col in inspector.get_columns('courses')]
    
    if 'enrollment_code' in columns:
        try:
            op.create_index(op.f('ix_courses_enrollment_code'), 'courses', ['enrollment_code'], unique=True, if_not_exists=True)
        except:
            pass
        return
    
    op.add_column('courses', sa.Column('enrollment_code', sa.String(), nullable=True))
    
    result = connection.execute(text("SELECT id FROM courses WHERE enrollment_code IS NULL"))
    courses = result.fetchall()
    
    used_codes = set()
    for course_id in courses:
        code = generate_enrollment_code()
        while code in used_codes:
            code = generate_enrollment_code()
        used_codes.add(code)
        
        connection.execute(
            text("UPDATE courses SET enrollment_code = :code WHERE id = :id"),
            {"code": code, "id": course_id[0]}
        )
    
    op.alter_column('courses', 'enrollment_code', nullable=False)
    op.create_index(op.f('ix_courses_enrollment_code'), 'courses', ['enrollment_code'], unique=True)


def downgrade() -> None:
    op.drop_index(op.f('ix_courses_enrollment_code'), table_name='courses')
    op.drop_column('courses', 'enrollment_code')

