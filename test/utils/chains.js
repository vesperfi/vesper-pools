'use strict'
const fs = require('fs')
const path = require('path')

function getChain() {
  const chain = process.env.TEST_CHAIN ? process.env.TEST_CHAIN : 'ethereum'
  const supported = fs.readdirSync(path.join(__dirname, '../../helper'))
  if (!supported.includes(chain)) {
    throw Error(`Unexpected process.env.TEST_CHAIN=${chain}. Use: [${supported}]`)
  }
  return chain
}

module.exports = { getChain }
