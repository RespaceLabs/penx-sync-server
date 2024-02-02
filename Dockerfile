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

ARG REDIS_URL
ARG TOKEN

ARG DATABASE_URL=postgres://postgres.lhbhzftdcwwpxivqacsj:qfLYycA3RmFHXor2@aws-0-us-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
ENV DATABASE_URL=${DATABASE_URL}

ENV NODE_ENV=production

CMD yarn start
