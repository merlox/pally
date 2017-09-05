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

      assert.equal(crowdsaleInstance.wallet(), web3.eth.accounts[0], "Wallet isn't correct")
      assert.equal(crowdsaleInstance.token(), tokenAddress, "Token address isn't correct")
   })

   it("Should calculate the excess tokens correctly with the proper rates, buy 3000 ether returning 14.5M instead of 15M", cb => {
      const amountToBuy = web3.toWei(3000, 'ether')
      const rateTier1 = 5000
      const rateTier2 = 4000
      const expectedTokens = (web3.toWei(2500, 'ether') * rateTier1 / 1e18) + (web3.toWei(500, 'ether') * rateTier2 / 1e18)

      crowdsaleInstance.setTierRates(rateTier1, rateTier2, rateTier2, rateTier2, {
         from: web3.eth.accounts[0],
         gas: 3000000
      }, (err, result) => {

         // Set timeout required to have time to mine the transaction on testrpc
         setTimeout(() => {
            crowdsaleInstance.calculateExcessTokens(amountToBuy, 12500000, 1, rateTier1, {
               from: web3.eth.accounts[0],
               gas: 4000000
            }, (err, totalTokens) => {
               assert.equal(totalTokens.toString(), expectedTokens, "The tokens received aren't correct")

               cb()
            })
         }, 2e3)
      })
   })

   it("Should buy 10 million tokens for 2000 ether at rate 5000 with the buyTokens function", cb => {
      const amountToBuy = web3.toWei(2000, 'ether')
      const rate = 5000
      const expectedTokens = amountToBuy * rate / 1e18
      let initialTokenBalance

      web3.eth.getBalance(web3.eth.accounts[0], (err, balance) => {
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

   it("Should buy 14.5 million tokens for an additional 1000 ether (including the past test tokens) at rate 5000 tier 1 and 4000 tier 2 with the buyTokens function", cb => {

      // You can't buy more than 2000 ether as defined by maxPurchase so we split it
      const amountToBuy = web3.toWei(1000, 'ether')
      const rateTier1 = 5000
      const rateTier2 = 4000
      const expectedTokens = (web3.toWei(2500, 'ether') * rateTier1 / 1e18) + (web3.toWei(500, 'ether') * rateTier2 / 1e18)
      let initialTokenBalance

      // 2500 at tier 1 rate 5000 = 12.5 Million tokens
      // 500 at tier 2 rate 4000 = 2 Million tokens

      web3.eth.getBalance(web3.eth.accounts[0], (err, balance) => {
         assert.equal(true, balance > amountToBuy, `You don\'t have the balance to buy ${web3.fromWei(amountToBuy, 'ether')} ethers`)

         crowdsaleInstance.setTierRates(rateTier1, rateTier2, rateTier2, rateTier2, {
            from: web3.eth.accounts[0],
            gas: 3000000
         }, (err, result) => {
            tokenInstance.balanceOf(web3.eth.accounts[0], (err, myBalance) => {
               initialTokenBalance = parseInt(myBalance)

               crowdsaleInstance.buyTokens(web3.eth.accounts[0], {
                  from: web3.eth.accounts[0],
                  gas: 4500000,
                  value: amountToBuy
               }, (err, transaction) => {

                  // Set timeout required to have time to mine the transaction
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
                  }, 2e3)
               })
            })
         })
      })
   })

   it("Should not allow you to buy more than 2000 ether, maxPurchase")

   it("Should not allow you to buy less than 0.1 ether, minPurchase")

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
