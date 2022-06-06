'use strict'
const fs = require('fs')
const hre = require('hardhat')
const path = require('path')

const CHAIN = {
  1: 'mainnet',
  137: 'polygon',
  42161: 'arbitrum',
  43114: 'avalanche',
}

function getChain() {
  // If exist use nodeChainId else use default chainId
  const chainId = hre.network.config.nodeChainId || hre.network.config.chainId
  const chain = CHAIN[chainId]
  if (!chain) {
    throw new Error(`Please configure chainId: ${chainId} in /test/chains.js`)
  }
  const supported = fs.readdirSync(path.join(__dirname, '../../helper'))
  if (!supported.includes(chain)) {
    throw Error(`Chain configuration data does not exist for "${chain}".`)
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
