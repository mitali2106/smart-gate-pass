process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret'

const jwt = require('jsonwebtoken')
const app = require('../server')

const makeToken = (role) => jwt.sign(
  { userId: 'test123', role, contractorId: null },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
)

describe('Role-based authorization tests', () => {

  test('contractor cannot access admin batch-approve endpoint', async () => {
    const token = makeToken('contractor')
    const res = await request(app)
      .post('/api/admin/approve-batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ workerIds: ['123'] })
    expect(res.statusCode).toBe(403)
  })

  test('security cannot access admin endpoint', async () => {
    const token = makeToken('security')
    const res = await request(app)
      .post('/api/admin/approve-batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ workerIds: ['123'] })
    expect(res.statusCode).toBe(403)
  })

  test('gate_officer cannot access admin endpoint', async () => {
    const token = makeToken('gate_officer')
    const res = await request(app)
      .post('/api/admin/approve-batch')
      .set('Authorization', `Bearer ${token}`)
      .send({ workerIds: ['123'] })
    expect(res.statusCode).toBe(403)
  })

  test('admin can access admin dashboard', async () => {
    const token = makeToken('admin')
    const res = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`)
    expect(res.statusCode).not.toBe(403)
  })

  test('contractor cannot access security entry endpoint', async () => {
    const token = makeToken('contractor')
    const res = await request(app)
      .post('/api/security/entry')
      .set('Authorization', `Bearer ${token}`)
      .send({ workerId: '123', qrPayload: 'test' })
    expect(res.statusCode).toBe(403)
  })

  test('no token returns 401', async () => {
    const res = await request(app)
      .get('/api/admin/dashboard')
    expect(res.statusCode).toBe(401)
  })

})