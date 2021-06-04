const abi = require('ethereumjs-abi')
const util = require('ethereumjs-util')
const BN = require('bn.js')

async function prefixed(hash) {
  return abi.soliditySHA3(
    ['string', 'bytes32'],
    ['\x19Ethereum Signed Message:\n32', hash]
  )
}

async function recoverSigner(message, signature) {
  let split = util.fromRpcSig(signature)
  let publicKey = util.ecrecover(message, split.v, split.r, split.s)
  let signer = util.pubToAddress(publicKey).toString('hex')
  return signer
}

const constructPaymentMessage = async function (contractAddress, amount) {
  return abi.soliditySHA3(
    ['address', 'uint256'],
    [contractAddress, amount]
  )
}

const signMessage = async function (web3, message, accountAddress) {
  return await web3.eth.sign(
    `0x${message.toString('hex')}`,
    accountAddress
  )
}

const isValidSignature = async function (contractAddress, amount, signature, expectedSigner) {
  let message = await constructPaymentMessage(contractAddress, amount)
  let prefixedMessage = await prefixed(message);
  let signer = await recoverSigner(prefixedMessage, signature)
  return signer.toLowerCase() === util.stripHexPrefix(expectedSigner).toLowerCase()
}

const assertFail = async function (promise, message) {
  try {
    await promise
    assert(false)
  } catch (e) {
    if (e.name === 'AssertionError') {
      if (message) assert(false, message)
      else assert(false)
    }
  }
}

module.exports = {
  constructPaymentMessage,
  signMessage,
  isValidSignature,
  assertFail
}
