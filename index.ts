require("dotenv").config({ path: __dirname + `/.env.${process.env.NODE_ENV}` });
import express from "express";
import jwt from "jsonwebtoken";

import Redis from "ioredis";
import bodyParser from "body-parser";
import cors from "cors";
import { EventEmitter } from "events";

EventEmitter.defaultMaxListeners = 1000;

type SseINfo = {
  eventType: "NODES_UPDATED" | "SPACES_UPDATED";
  spaceId: string;
  userId: string;
  lastModifiedTime: number;
};

type BodyInput = {
  token: string;
};

const port = process.env.PORT || 4000;

const redis = new Redis(process.env.REDIS_URL!);

async function main() {
  const app = express();
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(bodyParser.json());
  app.use(cors());

  app.get("/", (req, res) => {
    res.json({ hello: "world" });
  });

  app.post("/sse", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const data = `data: ${JSON.stringify({})}\n\n`;
    res.write(data);

    const body = (req.body || {}) as BodyInput;

    if (!body?.token) {
      res.end();
      return;
    }

    let userId = "";

    try {
      const decoded = jwt.verify(body.token, process.env.NEXTAUTH_SECRET!);
      userId = decoded.sub as string;
    } catch (error) {
      res.end();
      return;
    }
    //

    // console.log("=============userId:", userId);

    const CHANNEL = "NODES_SYNCED";

    redis.subscribe(CHANNEL, (_, count) => {
      // console.log("subscribe count.........:", count);
    });

    redis.on("message", async (channel, msg) => {
      console.log("=========msg:", msg);
      if (!msg) return;

      try {
        const spaceInfo: SseINfo = JSON.parse(msg);
        if (spaceInfo.userId === userId) {
          const data = `data: ${msg}\n\n`;
          res.write(data);
        }
      } catch (error) {
        res.end();
      }
    });

    req.on("close", () => {
      // console.log("close=========");
      // TODO: how to unsubscribe?
      // redis.unsubscribe(CHANNEL);
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
