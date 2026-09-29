DEV_COMPOSE = docker compose -f compose.yaml -f compose.dev.yaml

.PHONY: backend-format-check backend-run backend-test backend-verify dev dev-down dev-logs docker-build docker-down docker-up frontend-verify frontend-e2e verify

dev:
	$(DEV_COMPOSE) up -d --build --wait --wait-timeout 60

dev-down:
	$(DEV_COMPOSE) down

dev-logs:
	$(DEV_COMPOSE) logs -f api web

frontend-verify:
	pnpm --dir frontend format:check
	pnpm --dir frontend lint
	pnpm --dir frontend typecheck
	pnpm --dir frontend test
	pnpm --dir frontend build

frontend-e2e:
	pnpm --dir frontend test:e2e

backend-format-check:
	@test -z "$$(gofmt -l backend)" || { gofmt -d backend; exit 1; }

backend-run:
	@test -f .env || { echo "Missing .env. Copy .env.example to .env and set GEMINI_API_KEY."; exit 1; }
	@set -a; . ./.env; set +a; cd backend && exec go run ./cmd/api

backend-test:
	cd backend && go test ./...

backend-verify: backend-format-check
	cd backend && go vet ./...
	$(MAKE) backend-test

verify: frontend-verify backend-verify frontend-e2e

docker-build:
	docker compose build

docker-up:
	docker compose up -d --build --wait --wait-timeout 60

docker-down:
	docker compose down
