const SimplePaymentChannel = artifacts.require('./SimplePaymentChannel.sol')
const utils = require('./utils')

contract('SimplePaymentChannel', (accounts) => {
  let currentTime
  let instance
  let signatures = []

  const sender = accounts[0]
  const recipient = accounts[1]
  const deposit = web3.utils.toWei('10', 'ether')
  const duration = 60

  describe('constructor', () => {
    before(async () => {
      currentTime = Math.floor(new Date().getTime() / 1000)
      instance = await SimplePaymentChannel.new(recipient, duration, { from: sender, value: deposit })
    })

    it('sets the correct sender', async () => {
      assert(sender == await instance.sender.call())
    })

    it('sets the correct recipient', async () => {
      assert(recipient == await instance.recipient.call())
    })

    it('sets the correct expiration', async () => {
      assert.equal(currentTime + duration, await instance.expiration.call())
    })

    it('sets the correct balance', async () => {
      assert.equal(deposit, await web3.eth.getBalance(instance.address))
    })
  })

  describe('claimTimeout', () => {
    before(async () => {
      currentTime = Math.floor(new Date().getTime() / 1000)
      instance = await SimplePaymentChannel.new(recipient, 1, { from: sender, value: deposit })
    })

    it('can only be called after contract expiry', async () => {
      await utils.assertFail(instance.claimTimeout({ from: sender }))
    })

    it('returns balance to sender', async () => {
      let senderBalance = parseInt(await web3.eth.getBalance(sender), 10)
      let instanceBalance = parseInt(await web3.eth.getBalance(instance.address), 10)

      await new Promise((resolve) => setTimeout(resolve, 1000))

      await instance.claimTimeout({ from: sender })

      let finalSenderBalance = parseInt(await web3.eth.getBalance(sender), 10)
      assert(senderBalance + instanceBalance - 2e15 < finalSenderBalance)
    })
  })

  describe('close', () => {
    let senderBalance
    let recipientBalance

    before(async () => {
      currentTime = Math.floor(new Date().getTime() / 1000)
      instance = await SimplePaymentChannel.new(recipient, 1, { from: sender, value: deposit })

      let message = await utils.constructPaymentMessage(instance.address, web3.utils.toWei('1', 'ether'))
      let signature = await utils.signMessage(web3, message, sender)
      signatures.push(signature)
      
      assert.isTrue(await utils.isValidSignature(instance.address, web3.utils.toWei('1', 'ether'), signature, sender), 'local test')
      assert.isTrue(await instance.isValidSignature(web3.utils.toWei('1', 'ether'), signature), 'contract test')

      senderBalance = parseInt(await web3.eth.getBalance(sender), 10)
      recipientBalance = parseInt(await web3.eth.getBalance(recipient), 10)
    })

    it('cannot be called with invalid recipient balance', async () => {
      await utils.assertFail(instance.close(web3.utils.toWei('2', 'ether'), signatures[signatures.length - 1], { from: recipient }))
    })

    it('cannot be called by the sender', async () => {
      await utils.assertFail(instance.close(web3.utils.toWei('1', 'ether'), signatures[signatures.length - 1], { from: sender }))
    })

    it('remits payment to sender and recipient', async () => {
      await instance.close(web3.utils.toWei('1', 'ether'), signatures[signatures.length - 1], { from: recipient })
      assert.isTrue(senderBalance + parseInt(web3.utils.toWei('9', 'ether'), 10) - 2e15 < parseInt(await web3.eth.getBalance(sender), 10))
      assert.isTrue(recipientBalance + parseInt(web3.utils.toWei('1', 'ether'), 10) - 2e15 < parseInt(await web3.eth.getBalance(recipient), 10))
    })
  })
})