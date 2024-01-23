require('dotenv').config({
  path: process.cwd() + `/.env.${process.env.NODE_ENV}`,
})
import express from 'express'
import jwt from 'jsonwebtoken'

import Redis from 'ioredis'
import bodyParser from 'body-parser'
import cors from 'cors'
import { EventEmitter } from 'events'
import { syncNodes } from './syncNodes'
import { prisma } from './prisma-client'

console.log('============process.env.NODE_ENV:', process.env.NODE_ENV)
console.log('========process.env.REDIS_URL:', process.env.REDIS_URL)

EventEmitter.defaultMaxListeners = 1000

type SseINfo = {
  eventType: 'NODES_UPDATED' | 'SPACES_UPDATED'
  spaceId: string
  userId: string
  lastModifiedTime: number
}

type BodyInput = {
  token: string
}

const port = process.env.PORT || 4000

const redis = new Redis(process.env.REDIS_URL!)

function decodeToken(token: string): string | null {
  try {
    const decoded = jwt.verify(token, process.env.TOKEN!)
    const userId = decoded.sub as string
    return userId
  } catch (error) {
    return null
  }
}

async function main() {
  const app = express()
  app.use(bodyParser.urlencoded({ extended: false }))
  app.use(bodyParser.json())
  app.use(cors())

  app.get('/', (req, res) => {
    res.json({ hello: 'world', time: new Date() })
  })

  app.post('/get-all-nodes', async (req, res) => {
    const spaceId = req.body.spaceId as string
    const spaces = await prisma.node.findMany({
      where: { spaceId },
    })
    res.json(spaces)
  })

  app.post('/get-pullable-nodes', async (req, res) => {
    const userId = decodeToken(req.body.token)
    if (!userId) throw new Error('invalid token')

    const spaceId = req.body.spaceId as string
    const lastModifiedTime = req.body.lastModifiedTime as number
    const time = new Date(lastModifiedTime)

    const nodes = await prisma.node.findMany({
      where: {
        spaceId,
        updatedAt: { gt: time },
      },
    })

    res.json(nodes)
  })

  app.post('/push-nodes', async (req, res) => {
    const userId = decodeToken(req.body.token)
    if (!userId) throw new Error('invalid token')

    const time = await syncNodes({
      userId,
      ...req.body,
    })
    res.json({ time })
  })

  app.post('/sse', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const data = `data: ${JSON.stringify({})}\n\n`
    res.write(data)

    const body = (req.body || {}) as BodyInput

    const userId = decodeToken(req.body.token)

    if (!userId) {
      res.end()
      return
    }

    const CHANNEL = 'NODES_SYNCED'

    redis.subscribe(CHANNEL, (_, count) => {
      // console.log("subscribe count.........:", count);
    })

    redis.on('message', async (channel, msg) => {
      console.log('=========msg:', msg)
      if (!msg) return

      try {
        const spaceInfo: SseINfo = JSON.parse(msg)
        // if (spaceInfo.userId === userId) {
        //   const data = `data: ${msg}\n\n`
        //   res.write(data)
        // }

        const data = `data: ${msg}\n\n`
        res.write(data)
      } catch (error) {
        res.end()
      }
    })

    req.on('close', () => {
      // console.log("close=========");
      // TODO: how to unsubscribe?
      // redis.unsubscribe(CHANNEL);
    })
  })

  app.listen(port, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${port}`)
  })
}

main()
  .then(() => {})
  .catch((e) => {
    console.log(e)
  })
