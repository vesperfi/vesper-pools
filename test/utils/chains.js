'use strict'
const fs = require('fs')
const path = require('path')

function getChain() {
  const chain = process.env.TEST_CHAIN ? process.env.TEST_CHAIN : 'mainnet'
  const supported = fs.readdirSync(path.join(__dirname, '../../helper'))
  if (!supported.includes(chain)) {
    throw Error(`Unexpected process.env.TEST_CHAIN=${chain}. Use: [${supported}]`)
  }
  return chain
}

/**
 * Object containing chain specific data
 *
 * @typedef {object} ChainData
 * @property {object} address - Address object
 * @property {object} poolConfig - Pool configuration object
 * @property {object} strategyConfig - Strategy configuration object
 *
 */

/* eslint-disable no-param-reassign */
/**
 * Get chain data for provided chain. If no chain is provided,
 * fetch current chain and return data.
 *
 * @param {string} [chain] Chain name to get data for
 * @returns {ChainData} chain data
 */
function getChainData(chain) {
  if (!chain) {
    chain = getChain()
  }
  const address = require(`../../helper/${chain}/address`)
  const poolConfig = require(`../../helper/${chain}/poolConfig`)
  const strategyConfig = require(`../../helper/${chain}/strategyConfig`)
  return { address, poolConfig, strategyConfig }
}

/* eslint-enable */
module.exports = { getChain, getChainData }
