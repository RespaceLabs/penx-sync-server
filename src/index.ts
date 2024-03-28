require('dotenv').config({
  path: process.cwd() + `/.env.${process.env.NODE_ENV}`,
})
import express from 'express'

import Redis from 'ioredis'
import bodyParser from 'body-parser'
import cors from 'cors'
import { EventEmitter } from 'events'
import { prisma } from './lib/prisma-client'
import { initDatabase } from './lib/initDatabase'
import { decodeToken } from './lib/decodeToken'
import { syncNodes } from './lib/syncNodes'
import { auth } from './middlewares/auth'

type Response<T = any> = {
  success: boolean
  data: T
  error: any
  errorCode: string
  errorMessage: string
}

EventEmitter.defaultMaxListeners = 1000

type SseINfo = {
  eventType: 'NODES_UPDATED' | 'SPACES_UPDATED'
  spaceId: string
  userId: string
  lastModifiedTime: number
}

const port = process.env.PORT || 4000

const redis = new Redis(process.env.REDIS_URL!)

async function main() {
  const app = express()
  app.use(bodyParser.urlencoded({ limit: '100mb', extended: false }))
  app.use(bodyParser.json({ limit: '100mb' }))
  app.use(cors())

  await initDatabase()

  app.get('/', async (req, res) => {
    const nodes = await prisma.node.findMany({ take: 1 })
    res.json({
      nodes,
      hello: 'world',
      time: new Date(),
    })
  })

  app.post('/getNode', auth, async (req, res) => {
    const spaceId = req.body.spaceId as string
    const nodeId = req.body.nodeId as string

    try {
      const node = await prisma.node.findFirst({
        where: { spaceId, id: nodeId },
      })
      res.json(node)
    } catch (error) {
      res.json(null)
    }
  })

  app.post('/getAllNodes', auth, async (req, res) => {
    const spaceId = req.body.spaceId as string
    const nodes = await prisma.node.findMany({
      where: { spaceId },
    })
    res.json(nodes)
  })

  app.post('/getNodesLastUpdatedAt', auth, async (req, res) => {
    const spaceId = req.body.spaceId as string

    const node = await prisma.node.findFirst({
      where: { spaceId },
      orderBy: { updatedAt: 'desc' },
      take: 1,
    })

    res.json({
      updatedAt: node ? node.updatedAt.getTime() : null,
    })
  })

  app.post('/getPullableNodes', auth, async (req, res) => {
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

  app.post('/pushNodes', auth, async (req, res) => {
    const userId = decodeToken(req.body.token)

    try {
      console.log('start sync.........')

      const time = await syncNodes({
        userId,
        ...req.body,
      })

      console.log('time........:', time)

      res.json({
        success: true,
        data: time,
      } as Response)
    } catch (error: any) {
      console.log('==========error:', error)

      const errorCode = error.message.includes('NODES_BROKEN')
        ? 'NODES_BROKEN'
        : 'UNKNOWN'

      res.json({
        success: false,
        errorCode,
        errorMessage: errorCode,
        error,
      } as Response)
    }
  })

  app.post('/sse', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')

    const data = `data: ${JSON.stringify({})}\n\n`
    res.write(data)

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
      // console.log('=========msg:', msg)
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
