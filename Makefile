.PHONY: up down migrate createsuperuser

up:
	docker compose up -d --build

down:
	docker compose down

migrate:
	docker compose exec backend python manage.py migrate

createsuperuser:
	docker compose exec backend python manage.py createsuperuser
