import jwt from 'jsonwebtoken'

export function decodeToken(token: string, key?: string): string | null {
  try {
    const decoded = jwt.verify(token, key || process.env.TOKEN!)
    const userId = decoded.sub as string
    return userId
  } catch (error) {
    console.log('========error:', error)

    return null
  }
}
