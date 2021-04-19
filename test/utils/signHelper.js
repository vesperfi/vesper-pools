'use strict'

const {ecsign} = require('ethereumjs-util')
const {hdkey} = require('ethereumjs-wallet')
const bip39 = require('bip39')
const abiEncoder = web3.eth.abi
const {bytesToHex, keccak256, soliditySha3} = web3.utils

const PERMIT_TYPEHASH = keccak256('Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)')
const DELEGATION_TYPEHASH = keccak256('Delegation(address delegatee,uint256 nonce,uint256 expiry)')

async function getAccountData(mnemonic) {
  const seed = await bip39.mnemonicToSeed(mnemonic)
  const hdk = hdkey.fromMasterSeed(seed)
  const addrNode = hdk.derivePath('m/44\'/60\'/0\'/0/0')
  const owner = addrNode.getWallet().getAddressString()
  const privateKey = addrNode.getWallet().getPrivateKey()
  return {
    owner,
    privateKey,
  }
}

function getDomainSeparator(name, tokenAddress) {
  return keccak256(
    abiEncoder.encodeParameters(
      ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
      [
        keccak256('EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'),
        keccak256(name),
        keccak256('1'),
        1,
        tokenAddress,
      ]
    )
  )
}

async function getPermitlDigest(token, approve, nonce, deadline) {
  const name = await token.name()
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address)
  return soliditySha3(
    {type: 'bytes1', value: '0x19'},
    {type: 'bytes1', value: '0x01'},
    {type: 'bytes32', value: DOMAIN_SEPARATOR},
    {
      type: 'bytes32',
      value: keccak256(
        abiEncoder.encodeParameters(
          ['bytes32', 'address', 'address', 'uint256', 'uint256', 'uint256'],
          [PERMIT_TYPEHASH, approve.owner, approve.spender, approve.value, nonce, deadline]
        )
      ),
    }
  )
}

async function getDelegatelDigest(token, delegatee, nonce, deadline) {
  const name = await token.name()
  const DOMAIN_SEPARATOR = getDomainSeparator(name, token.address)
  return soliditySha3(
    {type: 'bytes1', value: '0x19'},
    {type: 'bytes1', value: '0x01'},
    {type: 'bytes32', value: DOMAIN_SEPARATOR},
    {
      type: 'bytes32',
      value: keccak256(
        abiEncoder.encodeParameters(
          ['bytes32', 'address', 'uint256', 'uint256'],
          [DELEGATION_TYPEHASH, delegatee, nonce, deadline]
        )
      ),
    }
  )
}

async function getPermitData(token, amount, ownerMnemonic, spender) {
  const {owner, privateKey} = await getAccountData(ownerMnemonic)
  const nonce = await token.nonces(owner)
  const block = await web3.eth.getBlock('latest')
  const deadline = block.timestamp + 120
  const digest = await getPermitlDigest(token, {owner, spender, value: amount}, nonce, deadline)
  const {v, r, s} = ecsign(Buffer.from(digest.slice(2), 'hex'), privateKey)
  return {
    owner,
    deadline,
    sign: {
      v,
      r: bytesToHex(r),
      s: bytesToHex(s),
    },
  }
}

async function getDelegateData(token, ownerMnemonic, delegatee) {
  const {owner, privateKey} = await getAccountData(ownerMnemonic)
  const nonce = await token.nonces(owner)
  const block = await web3.eth.getBlock('latest')
  const deadline = block.timestamp + 120
  const digest = await getDelegatelDigest(token, delegatee, nonce, deadline)
  const {v, r, s} = ecsign(Buffer.from(digest.slice(2), 'hex'), privateKey)
  return {
    deadline,
    nonce,
    sign: {
      v,
      r: bytesToHex(r),
      s: bytesToHex(s),
    },
  }
}

module.exports = {getDelegateData, getPermitData}
