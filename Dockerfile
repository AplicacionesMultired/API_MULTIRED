FROM ubuntu:latest

WORKDIR /app

COPY . .

RUN mv instantclient-basic-linux.x64-11.2.0.4.0.zip /opt && \
    mv node-v20.10.0-linux-x64.tar.xz /opt

WORKDIR /opt

RUN apt-get update && \
    apt-get install -y unzip xz-utils libaio1

RUN unzip instantclient-basic-linux.x64-11.2.0.4.0.zip && \
    tar -xf node-v20.10.0-linux-x64.tar.xz && \
    rm instantclient-basic-linux.x64-11.2.0.4.0.zip && \
    rm node-v20.10.0-linux-x64.tar.xz 

ENV LD_LIBRARY_PATH=/opt/instantclient_11_2:$LD_LIBRARY_PATH
ENV PATH=/opt/node-v20.10.0-linux-x64/bin:$PATH

RUN npm install --global yarn

RUN cd /opt/instantclient_11_2 && \
    ln -s libclntsh.so.11.1 libclntsh.so && \
    ln -s libocci.so.11.1 libocci.so

RUN sh -c "echo /opt/oracle/instantclient_11_2 > \
      /etc/ld.so.conf.d/oracle-instantclient.conf" && \
    ldconfig

WORKDIR /app

EXPOSE 3000

RUN yarn

CMD [ "yarn", "start"]