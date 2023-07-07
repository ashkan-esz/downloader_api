build-image:
	docker image build -t downloader-api-docker --network=host .

run-image:
	docker run --network=host --restart=always --memory 1224m --memory-swap 1700m --cpus=".5" -p 3000:3000 --env-file ./.env downloader-api-docker

up-dev:
	docker-compose up --build

up-prod:
	docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build

down:
	docker-compose down