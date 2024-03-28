import { prisma } from './prisma-client'

export async function initDatabase() {
  const r0 = await prisma.$executeRaw`
    CREATE TABLE IF NOT EXISTS "Node" (
        "id" TEXT NOT NULL,
        "spaceId" TEXT NOT NULL,
        "parentId" TEXT,
        "databaseId" TEXT,
        "type" TEXT NOT NULL,
        "element" JSONB NOT NULL,
        "props" JSONB,
        "collapsed" BOOLEAN NOT NULL DEFAULT false,
        "folded" BOOLEAN NOT NULL DEFAULT true,
        "children" JSONB,
        "date" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,

        CONSTRAINT "Node_pkey" PRIMARY KEY ("id")
    );
  `

  console.log('======r0:', r0)

  const r1 =
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Node_spaceId_idx" ON "Node"("spaceId");`

  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Node_type_idx" ON "Node"("type");`

  await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "Node_date_idx" ON "Node"("date");`

  console.log('======r1:', r1)
}
