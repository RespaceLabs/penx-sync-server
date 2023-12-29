require("dotenv").config({ path: __dirname + `/.env.${process.env.NODE_ENV}` });
import express from "express";

import Redis from "ioredis";
import bodyParser from "body-parser";
import cors from "cors";

const port = process.env.PORT || 5001;

console.log("===========process.env.REDIS_PASSWORD:", process.env.REDIS_PORT);

const redis = new Redis({
  host: process.env.REDIS_HOST!,
  port: Number(process.env.REDIS_PORT!),
  password: process.env.REDIS_PASSWORD!,
});

async function main() {
  const app = express();
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(cors());

  app.get("/", (req, res) => {
    res.json({ hello: "world" });
  });

  app.get("/space-info-sse", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const data = `data: ${JSON.stringify({})}\n\n`;
    res.write(data);

    const CHANNEL = "NODES_SYNCED";

    redis.subscribe(CHANNEL, (_, count) => {
      console.log("subscribe count.........:", count);
    });

    redis.on("message", async (channel, msg) => {
      if (!msg) return;
      const data = `data: ${msg}\n\n`;
      res.write(data);
    });

    req.on("close", () => {
      redis.unsubscribe(CHANNEL);
    });
  });

  app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
  });
}

main()
  .then(() => {})
  .catch((e) => {
    console.log(e);
  });
