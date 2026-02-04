#!/bin/bash

# Startup script for backend - drops audit_logs table before starting app
# This allows SQLAlchemy to recreate it correctly

echo "Running pre-startup migration..."

# Apply migration to drop audit_logs table
python3 apply_migration.py

# Run password reset and other migrations
echo "Running additional migrations..."
python3 run_migrations.py

# Fix timestamps in existing tickets (DISABLED TEMPORARILY)
# echo "Fixing timestamps in existing tickets..."
# python3 fix_timestamps_migration.py || echo "⚠ Timestamp migration failed, continuing anyway..."

if [ $? -eq 0 ]; then
    echo "✓ Migrations completed successfully"
else
    echo "⚠ Some migrations failed, but continuing anyway..."
fi

# Start the application
echo "Starting application..."
exec gunicorn wsgi:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120 --access-logfile - --error-logfile -

