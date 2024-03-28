// TODO: need improve this
require('dotenv').config({
  path: process.cwd() + `/.env.${process.env.NODE_ENV}`,
})
import { format } from 'date-fns'
import Redis from 'ioredis'
import { Node } from '@prisma/client'
import { INode, NodeType } from '../types/INode'
import { prisma } from './prisma-client'

const redis = new Redis(process.env.REDIS_URL!)

export type SyncUserInput = {
  userId: string
  spaceId: string
  nodes: INode[]
  isTodayNode: boolean
}

function isAllNodes(nodes: INode[]) {
  const set = new Set([
    NodeType.ROOT,
    NodeType.DATABASE_ROOT,
    NodeType.DAILY_ROOT,
  ])

  for (const node of nodes) {
    if (set.has(node.type)) set.delete(node.type)
  }

  return set.size === 0
}

function isSpaceBroken(nodes: INode[]) {
  const set = new Set([
    NodeType.ROOT,
    NodeType.DATABASE_ROOT,
    NodeType.DAILY_ROOT,
  ])

  for (const node of nodes) {
    if (set.has(node.type)) set.delete(node.type)
  }

  return set.size !== 0
}

export function syncNodes(input: SyncUserInput) {
  const { spaceId, userId, isTodayNode = false } = input

  const newNodes: INode[] = input.nodes.map((n) => ({
    id: n.id,
    spaceId: n.spaceId,
    parentId: n.parentId,
    databaseId: n.databaseId,
    type: n.type,
    element: n.element,
    props: n.props,
    collapsed: n.collapsed,
    folded: n.folded,
    children: n.children,
    date: n.date,
    createdAt: n.createdAt,
    updatedAt: n.updatedAt,
  }))

  // console.log('============newNodes:', newNodes, 'spaceId:', spaceId)

  if (!newNodes?.length) return null

  return prisma.$transaction(
    async (tx) => {
      let nodes: Node[] = []

      if (isAllNodes(newNodes)) {
        // console.log('sync all===================')
        await tx.node.deleteMany({ where: { spaceId } })
        await tx.node.createMany({ data: newNodes })
      } else {
        // console.log('sync diff==================')
        let todayNode: Node

        nodes = await tx.node.findMany({ where: { spaceId } })

        todayNode = nodes.find(
          (n) =>
            n.date === format(new Date(), 'yyyy-MM-dd') &&
            n.type === NodeType.DAILY,
        )

        // TODO: need improve this
        if (isTodayNode && !todayNode) {
          throw new Error('No today node found')
        }

        if (isSpaceBroken(nodes as INode[])) {
          throw new Error('NODES_BROKEN')
        }

        const nodeIdsSet = new Set(nodes.map((node) => node.id))

        const updatedNodes: INode[] = []
        const addedNodes: INode[] = []

        for (const n of newNodes) {
          if (nodeIdsSet.has(n.id)) {
            updatedNodes.push(n)
          } else {
            addedNodes.push(n)
          }
        }

        const newAddedNodes = isTodayNode
          ? addedNodes.map((n) => ({
              ...n,
              parentId: todayNode.id,
            }))
          : addedNodes

        await tx.node.createMany({ data: newAddedNodes })

        if (isTodayNode) {
          await tx.node.update({
            where: { id: todayNode.id },
            data: {
              children: [
                ...(todayNode.children as any),
                ...addedNodes.map((n) => n.id),
              ],
            },
          })
        }

        // console.log('=============todayNode:', todayNode)

        const promises = updatedNodes.map((n) => {
          return tx.node.update({ where: { id: n.id }, data: n })
        })

        await Promise.all(promises)
      }

      // TODO: should clean no used nodes
      nodes = await tx.node.findMany({
        where: { spaceId },
      })

      await cleanDeletedNodes(nodes as any, async (id) => {
        tx.node.delete({
          where: { id },
        })
      })

      const lastNode = await tx.node.findFirst({
        where: { spaceId: input.spaceId },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      })

      const key = 'NODES_SYNCED'
      const data = {
        spaceId,
        userId,
        lastModifiedTime: lastNode!.updatedAt.getTime(),
      }

      setTimeout(() => {
        redis.publish(key, JSON.stringify(data))
      }, 10)

      return lastNode?.updatedAt ?? null
    },
    {
      maxWait: 1000 * 60, // default: 2000
      timeout: 1000 * 60, // default: 5000
    },
  )
}

async function cleanDeletedNodes(
  nodes: INode[],
  deleteNode: (id: string) => Promise<void>,
) {
  const nodeMap = new Map<string, INode>()

  for (const node of nodes) {
    nodeMap.set(node.id, node)
  }

  for (const node of nodes) {
    // TODO: need improvement
    if (
      [
        NodeType.DATABASE,
        // NodeType.COLUMN,
        // NodeType.ROW,
        // NodeType.VIEW,
        // NodeType.CELL,
        NodeType.ROOT,
        NodeType.DAILY_ROOT,
        NodeType.DATABASE_ROOT,
      ].includes(node.type as NodeType)
    ) {
      continue
    }

    // if (!Reflect.has(node, 'parentId')) continue
    if (!node.parentId) continue

    const parentNode = nodeMap.get(node.parentId)
    const children = (parentNode?.children || []) as string[]

    if (!children.includes(node.id)) {
      // console.log('=======clear node!!!!', node, JSON.stringify(node.element))
      await deleteNode(node.id)
    }
  }
}
