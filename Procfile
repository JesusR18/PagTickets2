web: python setup_production.py && python manage.py collectstatic --noinput && gunicorn --bind 0.0.0.0:$PORT pagTickets.wsgi:application
