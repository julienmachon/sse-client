.PHONY: build test clean

install:
	@echo "Installing project's dependencies... 🚀"
	@docker-compose run --rm sse-client install

build:
	@echo "Building project... 👷"
	@docker-compose run --rm sse-client

test:
	@echo "Running tests... 🧪"
	@docker-compose run --rm sse-client test

lint:
	@echo "Linting... ✨"
	@docker-compose run --rm sse-client run lint

clean:
	@echo "Cleaning... 🧹"
	@docker-compose run --rm sse-client run clean
	@sudo rm -fr node_modules/