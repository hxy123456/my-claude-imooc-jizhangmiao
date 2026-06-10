/**
 * JWT 工具：签发与校验
 * token 负载只放最小必要字段（id + username），避免敏感信息泄露
 */
const jwt = require('jsonwebtoken')
const env = require('../config/env')
const { TOKEN_PAYLOAD_FIELDS } = require('../config/constants')

/**
 * 签发 access token
 * @param {{id:number, username:string}} user 用户基本信息
 * @returns {string} JWT 字符串
 */
function sign(user) {
  const payload = TOKEN_PAYLOAD_FIELDS.reduce((acc, key) => {
    acc[key] = user[key]
    return acc
  }, {})
  return jwt.sign(payload, env.jwt.secret, {
    issuer: env.jwt.issuer,
    expiresIn: env.jwt.expiresIn,
  })
}

/**
 * 校验 token 并返回负载
 * @param {string} token
 * @returns {{id:number, username:string, iat:number, exp:number}}
 * @throws {Error} 校验失败时抛出，附带 name 区分 InvalidToken/TokenExpired
 */
function verify(token) {
  return jwt.verify(token, env.jwt.secret, {
    issuer: env.jwt.issuer,
  })
}

module.exports = { sign, verify }
