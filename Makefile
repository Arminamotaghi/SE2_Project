up:
	docker compose up -d
	@echo "✅ Services are up!"
	@echo "Backend:  http://localhost:8000"
	@echo "Frontend: http://localhost:5173"

build:
	docker compose up -d --build

setup:
	docker compose up -d --build
	$(MAKE) init
	$(MAKE) seed
	@echo "✅ Everything is set up!"
	@echo "Backend:  http://localhost:8000"
	@echo "Frontend: http://localhost:5173"

init:
	docker compose exec backend python init_db.py

seed:
	docker compose exec backend python seed.py

down:
	docker compose down

clean:
	docker compose down -v

reset: clean setup

logs:
	docker compose logs -f

test:
	docker compose exec backend pytest -v