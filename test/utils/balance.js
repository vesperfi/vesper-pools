'use strict'

const hre = require('hardhat')
const Address = require('../../helper/mainnet/address')
const AvalancheAddress = require('../../helper/avalanche/address')
const PolygonAddress = require('../../helper/polygon/address')
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
  [Address.APE]: 0,
  [Address.MUSD]: 51,
  [Address.DPI]: 0,
  [Address.Vesper.VSP]: 0,
  [Address.Compound.cDAI]: 14,
  [Address.Compound.COMP]: 1,
  [Address.FEI]: 0,
  [Address.FRAX]: 0,
  [Address.APE]: 0,
  [Address.MUSD]: 51,
  [Address.Aave.stkAAVE]: 0,
  [Address.LMR]: 0,
  [Address.SHIB]: 0,

  // Avalanche addresses
  [AvalancheAddress.DAIe]: 0,
  [AvalancheAddress.USDC]: 9,
  [AvalancheAddress.USDCe]: 0,
  [AvalancheAddress.WBTCe]: 0,
  [AvalancheAddress.WETHe]: 0,
  [AvalancheAddress.NATIVE_TOKEN]: 3, // WAVAX
  [AvalancheAddress.Benqi.QI]: 1,
  [AvalancheAddress.Vesper.VSP]: 2,

  // Polygon addresses
  [PolygonAddress.DAI]: 0,
  [PolygonAddress.USDC]: 0,
  [PolygonAddress.USDT]: 0,
  [PolygonAddress.WBTC]: 0,
  [PolygonAddress.WETH]: 0,
  [PolygonAddress.NATIVE_TOKEN]: 3, // WMATIC
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
