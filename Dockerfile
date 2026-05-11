# syntax=docker/dockerfile:1

ARG BASE_IMAGE=djstomp/nodejs20-raknet:latest

FROM ${BASE_IMAGE}

ENV NODE_ENV=production
ENV MAIN_FILE=index.js

WORKDIR /app

COPY build/ ./

RUN test -f package.json
RUN test -f Install_NodeJS_Modules.sh
RUN test -f Run.sh
RUN bash ./Install_NodeJS_Modules.sh && npm cache clean --force

CMD ["bash", "./Run.sh"]
