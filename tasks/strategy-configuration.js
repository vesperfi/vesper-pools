'use strict'
const _ = require('lodash')
const fs = require('fs')
const copy = require('recursive-copy')

// Prepare constructor args keys
// eslint-disable-next-line complexity
function getConstructorArgKeys(strategyName) {
  // Most of the strategies has these keys
  let keys = ['swapManager', 'receiptToken', 'strategyName']

  if (strategyName.includes('RariFuse')) {
    // fusePoolId replaces receiptToken
    keys = ['swapManager', 'fusePoolId', 'strategyName']
  } else if (strategyName.includes('Convex') || strategyName.includes('Crv')) {
    // collateralIdx replaces receiptToken
    keys = ['swapManager', 'collateralIdx', 'strategyName']
  } else if (strategyName.includes('CompoundLeverage')) {
    // No strategy name
    keys = ['swapManager', 'receiptToken']
  } else if (strategyName.includes('CompoundXY')) {
    // Has borrowCToken but no strategy name
    keys = ['swapManager', 'receiptToken', 'borrowCToken']
  }

  // Separate conditions
  // Any combination of Earn strategies
  if (strategyName.includes('Earn')) {
    if (strategyName === 'EarnCrvSBTCPoolStrategyWBTC') {
      keys = ['swapManager', 'dripToken', 'strategyName']
    } else {
      keys.push('dripToken')
    }
  }

  if (strategyName.includes('Vesper') && !strategyName.includes('Maker')) {
    keys.push('vsp')
  }

  // Any combination of Maker strategies
  if (strategyName.includes('Maker')) {
    keys.push('collateralType')
  }
  return keys
}

// Validate given keys exists in given object
function validateObject(object, keys) {
  keys.forEach(function (key) {
    if (!_.has(object, key)) {
      throw new Error(`${key} is missing in strategy config`)
    }
  })
}

function validateStrategyConfig(strategyName, strategyConfig) {
  const topLevelKeys = ['contract', 'type', 'constructorArgs', 'config']
  // Validate top level properties in config object
  validateObject(strategyConfig, topLevelKeys)
  // Validate Strategy config. It will be added in PoolAccountant
  const configKeys = ['debtRatio']
  validateObject(strategyConfig.config, configKeys)
  // Validate constructor args
  validateObject(strategyConfig.constructorArgs, getConstructorArgKeys(strategyName))
  // Validate setup config
  const setupKeys = ['feeCollector', 'keepers']
  validateObject(strategyConfig.setup, setupKeys)
  // Validate Maker config
  if (strategyName.includes('Maker')) {
    const makerKeys = ['gemJoin', 'highWater', 'lowWater']
    validateObject(strategyConfig.setup.maker, makerKeys)
  }
}

/* eslint-disable complexity */
task('strategy-configuration', 'Prepare strategy configuration for deployment')
  .addOptionalParam('strategyName', 'Name of strategy to deploy')
  .addOptionalParam('targetChain', 'Target chain where contracts will be deployed')
  .addOptionalParam('strategyConfig', 'strategy config object')
  .addOptionalParam('multisigNonce', 'Starting nonce number to propose Gnosis safe multisig transaction')
  .addOptionalParam('oldStrategyName', 'Old Strategy name (needed in case contract name is changed during migration)')
  .setAction(async function ({
    strategyName,
    targetChain = hre.targetChain,
    strategyConfig,
    multisigNonce,
    oldStrategyName,
  }) {
    if (!strategyName) {
      // not deploying strategy
      return
    }
    let additionalConfig
    if (typeof strategyConfig === 'string') {
      additionalConfig = JSON.parse(strategyConfig)
    }
    const fileName = `../helper/${targetChain}/strategyConfig`
    let config = { ...require(fileName)[strategyName] }
    additionalConfig = { ...config.config, ...additionalConfig }
    config = { ...config, config: additionalConfig }
    if (!config) {
      throw new Error(`Missing strategy configuration in ${fileName}.js`)
    }

    validateStrategyConfig(strategyName, config)

    config.alias = strategyName
    if (strategyName.includes('RariFuse')) {
      config.alias = `${config.alias}#${config.constructorArgs.fusePoolId}`
    }

    console.log(
      `Deploying ${strategyName} on ${hre.network.name} for ${hre.targetChain} with following configuration: `,
      config,
    )

    // Set configuration in hre
    hre.strategyConfig = config
    hre.multisigNonce = multisigNonce
    hre.oldStrategyName = oldStrategyName

    // For localhost strategy deployment, if pool dir do not exits, then copy from targetChain.
    const networkDir = './deployments/localhost'
    const poolDir = `${networkDir}/${hre.poolName}`
    const targetChainNetworkDir = `./deployments/${targetChain}`
    if (hre.network.name === 'localhost' && !fs.existsSync(poolDir)) {
      const targetChainPoolDir = `${targetChainNetworkDir}/${hre.poolName}`
      if (fs.existsSync(targetChainPoolDir)) {
        await copy(targetChainPoolDir, poolDir, { overwrite: true })
      }
      // If not .chainId in localhost network directory then copy from targetChain network directory
      if (!fs.existsSync(`${networkDir}/.chainId`)) {
        await copy(`./deployments/${targetChain}`, networkDir, { dot: true, filter: '.chainId' })
      }
    }

    // CollateralManger.json is required for localhost Maker strategy deployment.
    if (hre.network.name === 'localhost' && strategyName.includes('Maker')) {
      const targetChainGlobalDir = `${targetChainNetworkDir}/global`
      if (fs.existsSync(targetChainGlobalDir)) {
        await copy(targetChainGlobalDir, `${networkDir}/global`, { overwrite: true, filter: 'CollateralManager.json' })
      }
    }
  })

module.exports = {}
