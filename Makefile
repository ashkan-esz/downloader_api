build-image:
	docker image build -t downloader-api-docker --network=host .

run-image:
	docker run --network=host --restart=always --memory 1224m --memory-swap 1700m --cpus=".5" -p 3000:3000 --env-file ./.env downloader-api-docker

run-images-compose:
	docker-compose --compatibility up -d --build

build-dev:
	COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose build

up-dev:
	docker-compose -f docker-compose.dev.yml down && docker-compose -f docker-compose.dev.yml --compatibility up --build

up-prod:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build

down:
	docker-compose down

run-redis:
	docker run  --rm --network=host --memory 200m -e ALLOW_EMPTY_PASSWORD=yes redis:alpine

redis-stat:
	docker-compose -f ./redis-stat.docker-compose.yml up --build

push-image:
	docker tag downloader-api-docker ashkanaz2828/downloader_api
	docker push ashkanaz2828/downloader_api

run-postgresDb:
	docker run --network=host --rm --name postgresDb -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=mysecretpassword -e POSTGRES_DB=downloader postgres:15.4-alpine3.18

signoz-install:
	unzip ./signoz/signoz.zip -d ./signoz
	cp ./signoz/edit-no-sample.yaml ./signoz/signoz-0.23.0/deploy/docker/clickhouse-setup/docker-compose.yaml
	cd signoz/signoz-0.23.0/deploy && sh ./install.sh

signoz-stop:
	cd signoz/signoz-0.23.0/deploy && docker-compose -f docker/clickhouse-setup/docker-compose.yaml stop

signoz-start:
	cd signoz/signoz-0.23.0/deploy && docker-compose -f docker/clickhouse-setup/docker-compose.yaml up -d

signoz-uninstall:
	cd signoz/signoz-0.23.0/deploy && docker-compose -f docker/clickhouse-setup/docker-compose.yaml down -v
	cd ./signoz && sudo rm -rf signoz-0.23.0