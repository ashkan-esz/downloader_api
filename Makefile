build-image:
	docker image build -t downloader-api-docker --network=host .

run-image:
	docker run --network=host --restart=always --memory 1224m --memory-swap 1700m --cpus=".5" -p 3000:3000 --env-file ./.env downloader-api-docker

run-images-compose:
	docker-compose --compatibility up -d --build

build-dev:
	COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose build

up-dev:
	docker-compose up --build

up-prod:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build

down:
	docker-compose down

redis-stat:
	docker-compose -f ./redis-stat.docker-compose.yml up --build

push-image:
	docker tag downloader-api ashkanaz2828/downloader_api
	docker push ashkanaz2828/downloader_api

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