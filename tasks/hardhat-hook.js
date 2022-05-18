'use strict'

const { TASK_TEST, TASK_TEST_RUN_MOCHA_TESTS } = require('hardhat/builtin-tasks/task-names')

/* eslint-disable no-shadow */

// Hardhat do not support adding chainId at runtime. Only way to set it in hardhat-config.js
// This task solve this problem for our usage and sets actual chainId to fork network.
// More info https://github.com/NomicFoundation/hardhat/issues/2167
task(TASK_TEST, async function (args, hre, runSuper) {
  // Create provider using actual node url being used for fork
  const provider = new ethers.providers.JsonRpcProvider(process.env.NODE_URL)
  const chainId = (await provider.getNetwork()).chainId
  // Set the actual node chain id in fork configuration
  hre.network.config.nodeChainId = chainId
  // Run parent "test" task from hardhat
  await runSuper()
})

// We have chain specific tests and if config doesn't exit it fails. This task is adding 1 extra
// message to error for easier error interpretation.
task(TASK_TEST_RUN_MOCHA_TESTS, async function (args, hre, runSuper) {
  // Run parent task which runs tests and on failure process error as needed.
  const exitCode = await runSuper().catch(function (error) {
    if (error.message === "Cannot read properties of undefined (reading 'config')") {
      const typeError = new Error(`Missing strategy configuration for ${hre.network.config.nodeChainId}`)
      typeError.stack = `${typeError.stack.split('\n').slice(0, 2).join('\n')}\n${error.stack}`
      throw typeError
    }
    throw error
  })
  return exitCode
})
