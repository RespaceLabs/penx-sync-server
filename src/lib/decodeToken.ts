import jwt from 'jsonwebtoken'

export function decodeToken(
  token: string,
  key = process.env.TOKEN as string,
): string | null {
  try {
    console.log('sync server token:', key)

    const decoded = jwt.verify(token, key)
    const userId = decoded.sub as string
    return userId
  } catch (error) {
    // console.log('token:', token, 'key===:', key)
    console.log('========error:', error)

    return null
  }
}
