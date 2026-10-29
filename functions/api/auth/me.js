import { json, currentUser } from '../_utils'

// GET /api/auth/me
export async function onRequestGet(context) {
  const u = await currentUser(context)
  return json({
    user: u ? { id: u.id, login: u.login, name: u.name, avatar: u.avatar } : null,
  })
}
