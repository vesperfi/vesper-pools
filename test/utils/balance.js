'use strict'

const hre = require('hardhat')
const ethers = hre.ethers
const {hexlify, parseUnits, solidityKeccak256, zeroPad} = ethers.utils

// Slot number mapping for a token. Prepared using utility https://github.com/kendricktan/slot20
const slots = {
  '0x6b175474e89094c44da98b954eedeac495271d0f': 2, // DAI
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2': 3, // WETH
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 9, // USDC
  '0xdac17f958d2ee523a2206206994597c13d831ec7': 2, // USDT
}

/**
 * Get slot number for a token
 *
 * @param {string} token  token address
 * @returns {number} slot number for provided token address
 */
function getSlot(token) {
  return slots[token.toLowerCase()]
}

/**
 * Update token balance for a given target address
 *
 * @param {string} token  token address
 * @param {string} targetAddress address at which token balance to be updated.
 * @param {number} balance balance amount to be set
 */

async function adjustBalance(token, targetAddress, balance) {
  const slot = getSlot(token)
  if (slots === undefined) {
    throw new Error(`Missing slot configuration for token ${token}`)
  }

  const index = hexlify(solidityKeccak256(['uint256', 'uint256'], [targetAddress, slot]))
  .replace('0x0', '0x') // reason: https://github.com/nomiclabs/hardhat/issues/1585 comments

  const newBalance = parseUnits(balance.toString(), 0)
  const value = hexlify(zeroPad(newBalance.toHexString(), 32))

  // Hack the balance by directly setting the EVM storage
  await ethers.provider.send('hardhat_setStorageAt', [token, index, value])
  await ethers.provider.send('evm_mine', [])
}

module.exports = {adjustBalance}
