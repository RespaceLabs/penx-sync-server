import { Request, Response, NextFunction } from 'express'
import { decodeToken } from '../lib/decodeToken'

export function auth(req: Request, res: Response, next: NextFunction) {
  const userId = decodeToken(req.body?.token)

  if (!userId) {
    res.status(400).json({ error: 'Invalid token' })
    return
  }
  next()
}
