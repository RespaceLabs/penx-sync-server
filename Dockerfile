FROM node:18-alpine as installer

WORKDIR /app

COPY ./package.json .

RUN yarn install

# 分阶段减少体积
FROM node:18-alpine as builder

WORKDIR /app

# 只复制需要的文件
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
