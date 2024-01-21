FROM node:18-alpine as installer

WORKDIR /app

COPY ./package.json .

RUN yarn install

FROM node:18-alpine as builder

WORKDIR /app

COPY . .

# copy node_modules
COPY --from=installer /app/node_modules ./node_modules

RUN yarn build 

# cleanup devDependencies
RUN npm prune --production

# run app
FROM node:18-alpine 


WORKDIR /app

COPY --from=builder /app .

CMD yarn start
