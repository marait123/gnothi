FROM tiangolo/uvicorn-gunicorn-fastapi:python3.8
RUN apt-get update -y && apt-get install -y wget unzip

RUN curl -s https://raw.githubusercontent.com/lefnire/ml-tools/master/dockerfiles/psql-client.sh | bash

RUN apt-get install -y default-libmysqlclient-dev

RUN pip install \
  python-multipart \
  fastapi-sqlalchemy \
  psycopg2-binary \
  sqlalchemy_utils \
  pandas \
  requests \
  apscheduler \
  markdown \
  python-box \
  tqdm \
  mysqlclient \
  cryptography \
  fastapi-users[sqlalchemy] \
  asyncpg \
  bcrypt \
  shortuuid \
  pytest \
  pytest-timeout \
  lorem-text \
  boto3 \
  dynaconf

COPY ./server/app /app/app
COPY ./common /app/common
WORKDIR /app

EXPOSE 80
EXPOSE 443
