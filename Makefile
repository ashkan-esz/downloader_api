build-image:
	docker image build -t downloader-api-docker --network=host .

run-image:
	docker run --network=host --rm --memory 1224m --memory-swap 1700m --cpus=".5" -p 3000:3000 --env-file ./env/.env downloader-api-docker

run-images-compose:
	docker-compose --compatibility up -d --build

build-dev:
	COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose build

up-dev:
	docker-compose -f docker-compose.dev.yml down && docker-compose -f docker-compose.dev.yml --compatibility up --build

up-prod:
	docker-compose down
	docker container prune -f
	docker-compose --compatibility up --build

down:
	docker-compose down

run-postgres:
	docker run --restart unless-stopped --network=host --memory 500m -v pgdata:/var/lib/postgresql/data -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_DB=downloader postgres:16.0-alpine3.18

run-redis:
	docker run  --rm --network=host --memory 200m -e ALLOW_EMPTY_PASSWORD=yes redis:alpine

redis-stat:
	docker-compose -f ./docker/redis-stat.docker-compose.yml up --build

push-image:
	docker tag downloader-api-docker ashkanaz2828/downloader_api
	docker push ashkanaz2828/downloader_api

run-postgresDb:
	docker run --network=host --rm --name postgresDb -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_DB=downloader postgres:16.0-alpine3.18

signoz-install:
	unzip ./docker/signoz/signoz.zip -d ./docker/signoz
	cp ./docker/signoz/edit-no-sample.yaml ./docker/signoz/signoz-0.23.0/deploy/docker/clickhouse-setup/docker-compose.yaml
	cd docker/signoz/signoz-0.23.0/deploy && sh ./install.sh

signoz-stop:
	cd docker/signoz/signoz-0.23.0/deploy && docker-compose -f docker/clickhouse-setup/docker-compose.yaml stop

signoz-start:
	cd docker/signoz/signoz-0.23.0/deploy && docker-compose -f docker/clickhouse-setup/docker-compose.yaml up -d

signoz-uninstall:
	cd docker/signoz/signoz-0.23.0/deploy && docker-compose -f docker/clickhouse-setup/docker-compose.yaml down -v
	cd ./docker/signoz && sudo rm -rf signoz-0.23.0

build_rabbitmq:
	docker image build --network=host -t rabbitmq ./docker/rabbitmq

run_rabbitmq:
	#docker run -d --hostname rabbitmq --name rabbitmq -p 15672:15672 -p 5672:5672 --network rabbitnet -e RABBITMQ_DEFAULT_USER=user -e RABBITMQ_DEFAULT_PASS=password rabbitmq
	docker run --restart unless-stopped --network=host --hostname rabbitmq --name rabbitmq -p 15672:15672 -p 5672:5672 -e RABBITMQ_DEFAULT_USER=user -e RABBITMQ_DEFAULT_PASS=password rabbitmq
