FROM ants/nodejs:v1
MAINTAINER David Bruant <bruant.d@gmail.com>

RUN mkdir /var/espg
WORKDIR /var/espg

COPY . /var/espg