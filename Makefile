up:
	docker compose up -d
build:
	docker compose up -d --build

setup:
	docker compose up -d --build
	sleep 15
	$(MAKE) init
	$(MAKE) seed
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