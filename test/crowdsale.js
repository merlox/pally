const assert = require('assert')
const PallyCoin = artifacts.require('PallyCoin')
const Crowdsale = artifacts.require('Crowdsale')
let tokenInstance = {}
let crowdsaleInstance = {}

/**
 * 1. Set the crowdsale address for the token instance
 * 2. Set the tier rates for the crowdsale instance
 * 3. Use it.
 */
contract('Crowdsale', accounts => {
   before(cb => {
      console.log('Preparing contracts for the tests...')

      crowdsaleInstance = web3.eth.contract(Crowdsale.abi).at(Crowdsale.address)
      tokenInstance = web3.eth.contract(PallyCoin.abi).at(crowdsaleInstance.token())
      tokenInstance.setCrowdsaleAddress(crowdsaleInstance.address, {
         from: web3.eth.accounts[0],
         gas: 4000000
      }, (err, result) => {
         cb()
      })
   })

   it("Should set the constructor data correctly", () => {
      const wallet = web3.eth.accounts[0]
      const tokenAddress = tokenInstance.address

      // Don' check for the start time because it changes everytime
      assert.equal(crowdsaleInstance.wallet(), web3.eth.accounts[0], "Wallet isn't correct")
      assert.equal(crowdsaleInstance.token(), tokenAddress, "Token address isn't correct")
   })

   it("Should buy tokens with the buyTokens function", cb => {
      const amountToBuy = web3.toWei(1, 'ether')
      const rate = 5000
      const expectedTokens = amountToBuy * rate / 1e18
      let initialTokenBalance

      web3.eth.getBalance(web3.eth.accounts[0], (err, balance) => {
         console.log(`You have ${parseFloat(web3.fromWei(balance, 'ether'))} ethers`)

         assert.equal(true, balance > amountToBuy, `You don\'t have the balance to buy ${web3.fromWei(amountToBuy, 'ether')} ethers`)

         crowdsaleInstance.setTierRates(rate, rate, rate, rate, {
            from: web3.eth.accounts[0],
            gas: 3000000
         }, (err, result) => {
            tokenInstance.balanceOf(web3.eth.accounts[0], (err, myBalance) => {
               initialTokenBalance = parseInt(myBalance)

               crowdsaleInstance.buyTokens(web3.eth.accounts[0], {
                  from: web3.eth.accounts[0],
                  gas: 4000000,
                  value: amountToBuy
               }, (err, transaction) => {
                  setTimeout(() => {
                     tokenInstance.balanceOf(web3.eth.accounts[0], (err, myBalance) => {
                        crowdsaleInstance.tokensRaised((err, tokens) => {
                           console.log('Tokens raised -->')
                           console.log(tokens.toString())

                           assert.equal(tokens.toString(), expectedTokens, 'The tokens raised are not correct')
                           assert.equal(initialTokenBalance + expectedTokens, parseInt(myBalance), 'The balance is not correct after buying tokens')

                           cb()
                        })
                     })
                  }, 5e3)
               })
            })
         })
      })
   })

   it("Should check if the crowdsale has ended or not", cb => {
      crowdsaleInstance.hasEnded((err, hasEnded) => {
         assert.equal(hasEnded, false, 'It must be not ended until October 30 at 00:00:00 or 12:00 pm')

         cb()
      })
   })
})

function l(m) {
   console.log(m)
}
