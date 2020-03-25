FROM node:12

WORKDIR hermes

COPY package.json yarn.lock ./
RUN yarn --frozen-lockfile

COPY . ./
ENV PATH $PATH:/hermes/node_modules/.bin

CMD yarn test
