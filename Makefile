# Zilkworm docs — common tasks
.DEFAULT_GOAL := help
.PHONY: help dev build serve

help: ## List available targets
	@echo "Zilkworm docs — make targets:"
	@echo "  make dev     run the dev server with hot reload (http://localhost:3000)"
	@echo "  make build   build the static site into ./build"
	@echo "  make serve   build, then serve the production site (http://localhost:3000)"

dev: ## Run the Docusaurus dev server (hot reload)
	npm start

build: ## Build the static site into ./build
	npm run build

serve: build ## Build, then serve the production site on localhost
	npm run serve
