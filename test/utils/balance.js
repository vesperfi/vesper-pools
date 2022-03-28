'use strict'

const hre = require('hardhat')
const Address = require('../../helper/mainnet/address')
const AvalancheAddress = require('../../helper/avalanche/address')
const ethers = hre.ethers
const { BigNumber } = require('ethers')
const { hexlify, solidityKeccak256, zeroPad, getAddress, hexStripZeros } = ethers.utils

// Slot number mapping for a token. Prepared using utility https://github.com/kendricktan/slot20
const slots = {
  [Address.DAI]: 2,
  [Address.WETH]: 3,
  [Address.USDC]: 9,
  [Address.USDT]: 2,
  [Address.WBTC]: 0,
  [Address.UNI]: 4,
  [Address.MIM]: 0,
  [Address.ALUSD]: 1,
  [Address.LINK]: 1,
  [Address.VSP]: 0,
  [Address.Compound.cDAI]: 14,
  [Address.Compound.COMP]: 1,

  // Avalanche addresses
  [AvalancheAddress.DAI]: 0,
  [AvalancheAddress.WBTC]: 0,
}

/**
 * Get slot number for a token
 *
 * @param {string} token  token address
 * @returns {number} slot number for provided token address
 */
function getSlot(token) {
  // only use checksum address
  return slots[getAddress(token)]
}

/**
 * Update token balance for a given target address
 *
 * @param {string} token  token address
 * @param {string} targetAddress address at which token balance to be updated.
 * @param {BigNumber|string|number} balance balance amount to be set
 */

async function adjustBalance(token, targetAddress, balance) {
  const slot = getSlot(token)
  if (slot === undefined) {
    throw new Error(`Missing slot configuration for token ${token}`)
  }

  // reason: https://github.com/nomiclabs/hardhat/issues/1585 comments
  // Create solidity has for index, convert it into hex string and remove all the leading zeros
  const index = hexStripZeros(hexlify(solidityKeccak256(['uint256', 'uint256'], [targetAddress, slot])))

  if (!BigNumber.isBigNumber(balance)) {
    // eslint-disable-next-line no-param-reassign
    balance = BigNumber.from(balance)
  }

  const value = hexlify(zeroPad(balance.toHexString(), 32))

  // Hack the balance by directly setting the EVM storage
  await ethers.provider.send('hardhat_setStorageAt', [token, index, value])
  await ethers.provider.send('evm_mine', [])
}

module.exports = { adjustBalance }
