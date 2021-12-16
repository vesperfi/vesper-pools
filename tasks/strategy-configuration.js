'use strict'
const _ = require('lodash')

// Prepare constructor args keys
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
  const configKeys = ['interestFee', 'debtRatio', 'debtRate']
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

task('strategy-configuration', 'Prepare strategy configuration for deployment')
  .addOptionalParam('strategyName', 'Name of strategy to deploy')
  .addOptionalParam('targetChain', 'Target chain where contracts will be deployed')
  .setAction(async function ({ strategyName, targetChain = hre.targetChain }) {
    if (!strategyName) {
      // not deploying strategy
      return
    }
    const fileName = `../helper/${targetChain}/strategyConfig`
    const strategyConfig = require(fileName)[strategyName]
    if (!strategyConfig) {
      throw new Error(`Missing strategy configuration in ${fileName}.js`)
    }

    validateStrategyConfig(strategyName, strategyConfig)

    strategyConfig.alias = strategyName
    if (strategyName.includes('RariFuse')) {
      strategyConfig.alias = `${strategyConfig.alias}#${strategyConfig.constructorArgs.fusePoolId}`
    }

    console.log(
      `Deploying ${strategyName} on ${hre.network.name} for ${hre.targetChain} with following configuration: `,
      strategyConfig,
    )

    // Set configuration in hre
    hre.strategyConfig = strategyConfig
  })

module.exports = {}
