'use strict'
// Prepare gnosis transaction initiation refer: https://docs.gnosis-safe.io/tutorials/tutorial_tx_service_initiate_sign
const ethers = require('ethers')
const Wallet = ethers.Wallet
const axios = require('axios')
const { utils } = ethers
const gnosisAbi = require('./abis/gnosisAbi.json')

const getBaseUrl = function (targetChain) {
  return `https://safe-transaction.${targetChain}.gnosis.io`
}

const isDeployerADelegate = async function (safe, deployer, targetChain) {
  const {
    data: { count, results },
  } = await axios.get(`${getBaseUrl(targetChain)}/api/v1/safes/${safe}/delegates`)
  if (count === 0) return false
  const delegates = results.map(r => r.delegate)
  return delegates.includes(deployer)
}

const getMultisigNonce = async function (safe, targetChain) {
  return (await axios.get(`${getBaseUrl(targetChain)}/api/v1/safes/${safe}`)).data
}

function getProvider() {
  return new ethers.providers.JsonRpcProvider(process.env.NODE_URL)
}

function getGnosisContract(safe) {
  return new ethers.Contract(safe, gnosisAbi, getProvider())
}

async function isDelegateOrOwner(safe, deployer, targetChain) {
  const multiSigContract = getGnosisContract(safe)
  const signers = await multiSigContract.getOwners()
  const isDelegate = await isDeployerADelegate(safe, deployer, targetChain)
  return signers.includes(deployer) || isDelegate
}

const gnosisProposeTx = async function (safe, tx, targetChain) {
  return axios.post(`${getBaseUrl(targetChain)}/api/v1/safes/${safe}/multisig-transactions/`, tx)
}

const getSafeCompatibleSignature = async function (transactionHash) {
  const wallet = Wallet.fromMnemonic(process.env.MNEMONIC)
  wallet.connect(getProvider())
  const typedDataHash = utils.arrayify(transactionHash)
  // refer https://github.com/gnosis/safe-contracts/blob/main/src/utils/execution.ts#L97
  return (await wallet.signMessage(typedDataHash)).replace(/1b$/, '1f').replace(/1c$/, '20')
}

/**
 * Submit transaction using gnosis.
 *
 * @param {string} safe           gnosis safe address
 * @param {string} to             receiver / target contract address
 * @param {string} data           target contract method encoded data (prepared using populateTransaction)
 * @param {string} nonce          gnosis nonce
 */
const submitGnosisTxn = async function ({ safe, to, data, nonce, sender, targetChain }) {
  const baseTxn = {
    to: utils.getAddress(to),
    value: 0,
    data: data || '0x',
    operation: 0,
  }

  const txn = {
    ...baseTxn,
    safeTxGas: 0,
    baseGas: 0,
    gasPrice: 0,
    gasToken: ethers.constants.AddressZero,
    refundReceiver: ethers.constants.AddressZero,
    nonce,
  }

  const gnosisSafe = getGnosisContract(safe)
  const contractTransactionHash = await gnosisSafe.getTransactionHash(
    txn.to,
    txn.value,
    txn.data,
    txn.operation,
    txn.safeTxGas,
    txn.baseGas,
    txn.gasPrice,
    ethers.constants.AddressZero,
    ethers.constants.AddressZero,
    nonce,
  )
  const signature = await getSafeCompatibleSignature(contractTransactionHash)
  const toSend = {
    ...txn,
    contractTransactionHash,
    signature,
    sender,
  }
  console.log({ toSend })
  await gnosisProposeTx(safe, toSend, targetChain)
}

module.exports = {
  isDelegateOrOwner,
  submitGnosisTxn,
  getMultisigNonce,
}
