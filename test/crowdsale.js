const assert = require('assert')
const chai = require('chai')
const should = chai.should()
const PallyCoin = artifacts.require('PallyCoin')
const Crowdsale = artifacts.require('Crowdsale')
const RefundVault = artifacts.require('RefundVault')
let tokenInstance = {}
let crowdsaleInstance = {}
let vaultInstance = {}

function getTokens(weiAmount, rate) {
   return weiAmount * rate
}

/**
 * 1. Set the crowdsale address for the token instance
 * 2. Set the tier rates for the crowdsale instance
 * 3. Use it.
 */
contract('Crowdsale', accounts => {

   // It'll be used accross several functions
   const rateTier1 = 5000
   const rateTier2 = 4000
   const rateTier3 = 3000
   const rateTier4 = 2000

   // Create new token and crowdsale contract instances for each test
   beforeEach(async () => {
      tokenInstance = await PallyCoin.new()

      const startTime = Math.floor(new Date().getTime() / 1000)

      crowdsaleInstance = await Crowdsale.new(web3.eth.accounts[0], tokenInstance.address, startTime, 0, {
         from: web3.eth.accounts[0],
         gas: 4e6
      })

      const vaultAddress = await crowdsaleInstance.vault()
      vaultInstance = web3.eth.contract(RefundVault.abi).at(vaultAddress)

      await tokenInstance.setCrowdsaleAddress(crowdsaleInstance.address, {
         from: web3.eth.accounts[0],
         gas: 4e6
      })

      await crowdsaleInstance.setTierRates(rateTier1, rateTier2, rateTier3, rateTier4, {
         from: web3.eth.accounts[0],
         gas: 4e6
      })
   })

   it("Should set the constructor data correctly", () => {
      return new Promise(async (resolve, reject) => {
         assert.equal(await crowdsaleInstance.wallet(), web3.eth.accounts[0], "Wallet isn't correct")
         assert.equal(await crowdsaleInstance.token(), tokenInstance.address, "Token address isn't correct")

         resolve()
      })
   })

   it("Should set the vault wallet address correctly", () => {
      return new Promise(async (resolve, reject) => {
         const vaultAddress = await crowdsaleInstance.vault()
         const vaultInstance = web3.eth.contract(RefundVault.abi).at(vaultAddress)

         assert.equal(await vaultInstance.wallet(), web3.eth.accounts[0], 'The wallet address of the vault isn\'t correct')

         resolve()
      })
   })

   it("Should set the tier rates of the crowdsale instance correctly", () => {
      return new Promise(async (resolve, reject) => {
         await crowdsaleInstance.setTierRates(rateTier1, rateTier2, rateTier3, rateTier4, {
            from: web3.eth.accounts[0],
            gas: 4e6
         })

         const rate1 = parseInt(await crowdsaleInstance.rate())
         const rate2 = parseInt(await crowdsaleInstance.rateTier2())
         const rate3 = parseInt(await crowdsaleInstance.rateTier3())
         const rate4 = parseInt(await crowdsaleInstance.rateTier4())

         assert.equal(rate1, rateTier1, 'The rate 1 is not correctly set')
         assert.equal(rate2, rateTier2, 'The rate 2 is not correctly set')
         assert.equal(rate3, rateTier3, 'The rate 3 is not correctly set')
         assert.equal(rate4, rateTier4, 'The rate 4 is not correctly set')

         resolve()
      })
   })

   it("Should buy 10 million tokens for 2000 ether at rate 5000 with buyTokens()", () => {
      return new Promise(async (resolve, reject) => {
         const amountToBuy = web3.toWei(2000, 'ether')
         const initialTokenBalance = parseFloat(await tokenInstance.balanceOf(web3.eth.accounts[2]))
         const expectedTokens = 10e24

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[2],
            gas: 4e6,
            value: amountToBuy
         })

         const tokensRaised = (await crowdsaleInstance.tokensRaised()).toString()
         const finalTokenBalance = parseFloat(await tokenInstance.balanceOf(web3.eth.accounts[2]))

         assert.equal(tokensRaised, expectedTokens, 'The tokens raised aren\'t correct')
         finalTokenBalance.should.equal(initialTokenBalance + expectedTokens, "The balance is not correct")

         resolve()
      })
   })

   it("Should calculate the excess tokens with the proper rates, buy 1000 ether + 2000 ether returning 14.5M instead of 15M", () => {
      return new Promise(async (resolve, reject) => {
         const amountToBuy = web3.toWei(2000, 'ether')
         const amountToBuy2 = web3.toWei(1000, 'ether')
         const expectedTokens = new web3.BigNumber(14.5e24)

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[0],
            value: amountToBuy
         })

         const secondPurchaseTokens = await crowdsaleInstance.calculateExcessTokens(amountToBuy2, 12.5e24, 1, rateTier1, {
            from: web3.eth.accounts[1],
            gas: 4e6
         })

         assert.ok(new web3.BigNumber(10e24).add(secondPurchaseTokens).eq(expectedTokens),
            "The tokens received aren't correct"
         )

         resolve()
      })
   })

   it("Should buy 14.5 million tokens for 3000 ether with buyTokens() in steps of 2000 + 1000 ether respecting the max purchase limit of 2000 ether", () => {
      return new Promise(async (resolve, reject) => {

         // You can't buy more than 2000 ether as defined by maxPurchase so we split it
         // 2500 at tier 1 rate 5000 = 12.5 Million tokens
         // 500 at tier 2 rate 4000 = 2 Million tokens
         const amountToBuy1 = web3.toWei(2000, 'ether')
         const amountToBuy2 = web3.toWei(1000, 'ether')
         const expectedTokens = 14.5e24

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[0],
            gas: 4500000,
            value: amountToBuy1
         })

         // Change the from: because each user has a limitation of 2000 ether per purchase
         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[1],
            gas: 4500000,
            value: amountToBuy2
         })

         const tokensRaised = (await crowdsaleInstance.tokensRaised()).toString()

         assert.equal(tokensRaised, expectedTokens, 'The tokens raised are not correct')
         resolve()
      })
   })

   it("Should buy 34 million tokens for 8625 ether with buyTokens()", () => {
      return new Promise(async (resolve, reject) => {

         // You can't buy more than 2000 ether as defined by maxPurchase so we split it
         const amountToBuy = web3.toWei(2000, 'ether')
         const amountToBuy2 = web3.toWei(2000, 'ether')
         const amountToBuy3 = web3.toWei(2000, 'ether')
         const amountToBuy4 = web3.toWei(2000, 'ether')
         const amountToBuy5 = web3.toWei(625, 'ether')
         const expectedTokens = 34e24

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[0],
            gas: 4e6,
            value: amountToBuy
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[1],
            gas: 4e6,
            value: amountToBuy2
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[2],
            gas: 4e6,
            value: amountToBuy3
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[3],
            gas: 4e6,
            value: amountToBuy4
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[4],
            gas: 4e6,
            value: amountToBuy5
         })

         const tokensRaised = (await crowdsaleInstance.tokensRaised()).toString()

         assert.equal(tokensRaised, expectedTokens, 'The tokens raised are not correct')

         resolve()
      })
   })

   // Checking that the balanceOf stays the same because the transaction was reverted
   it("Should allow you to buy 3000 ether by returning 1000 and buying 2000", () => {
      return new Promise(async (resolve, reject) => {
         const amountToBuy = web3.toWei(3000, 'ether')
         const expectedTokens = 10e24

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[0],
            gas: 4500000,
            value: amountToBuy
         })

         setTimeout(async () => {
            const raisedTokens = (await crowdsaleInstance.tokensRaised()).toString()

            assert.equal(expectedTokens, raisedTokens, 'The tokens raised are not correct')

            resolve()
         }, 2e3)
      })
   })

   // Checking that the balanceOf stays the same because the transaction was reverted
   it("Should not allow you to buy less than 0.1 ether, minPurchase", () => {
      return new Promise(async (resolve, reject) => {
         const amountToBuy = web3.toWei(0.001, 'ether')
         const tokensExpected = 0

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[0],
            gas: 4500000,
            value: amountToBuy
         })

         setTimeout(async () => {
            const tokensRaised = (await crowdsaleInstance.tokensRaised()).toString()

            assert.equal(tokensExpected, tokensRaised, 'The tokens raised aren\'t correct after buying tokens')

            resolve()
         }, 2e3)
      })
   })

   // This is how close you can get if you try to purchase the exact amount of 50 million tokens
   it("Should buy 50 million tokens for 16041,7 ether with the buyTokens function", () => {
      return new Promise(async (resolve, reject) => {

         // You can't buy more than 2000 ether as defined by maxPurchase so we split it
         const amountToBuy = web3.toWei(2000, 'ether')
         const amountToBuy2 = web3.toWei(2000, 'ether')
         const amountToBuy3 = web3.toWei(2000, 'ether')
         const amountToBuy4 = web3.toWei(2000, 'ether')
         const amountToBuy5 = web3.toWei(2000, 'ether')
         const amountToBuy6 = web3.toWei(2000, 'ether')
         const amountToBuy7 = web3.toWei(2000, 'ether')
         const amountToBuy8 = web3.toWei(2000, 'ether')
         const amountToBuy9 = web3.toWei(41.7, 'ether') // 41.6666...
         const expectedTokens = new web3.BigNumber(5e25)

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[0],
            gas: 4e6,
            value: amountToBuy
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[1],
            gas: 4e6,
            value: amountToBuy2
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[2],
            gas: 4e6,
            value: amountToBuy3
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[3],
            gas: 4e6,
            value: amountToBuy4
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[4],
            gas: 4e6,
            value: amountToBuy5
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[5],
            gas: 4e6,
            value: amountToBuy6
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[6],
            gas: 4e6,
            value: amountToBuy7
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[8],
            gas: 4e6,
            value: amountToBuy8
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[7],
            gas: 4e6,
            value: amountToBuy9
         })


         setTimeout(async () => {
            const tokensRaised = await crowdsaleInstance.tokensRaised()

            assert.ok(expectedTokens.eq(tokensRaised), 'The tokens raised are not correct')

            resolve()
         }, 3e3)
      })
   })

   // Checking that the amount of tokens is limited to 50 million even if people purchase more than expected,
   // buying 18000 ether which is more than the amount required to buy 50 million tokens (16041 ether)
   it("Should buy up to 50 million tokens limiting the ether received when exceeding the maximum", () => {
      return new Promise(async (resolve, reject) => {

         // You can't buy more than 2000 ether as defined by maxPurchase so we split it
         const amountToBuy = web3.toWei(2000, 'ether')
         const amountToBuy2 = web3.toWei(2000, 'ether')
         const amountToBuy3 = web3.toWei(2000, 'ether')
         const amountToBuy4 = web3.toWei(2000, 'ether')
         const amountToBuy5 = web3.toWei(2000, 'ether')
         const amountToBuy6 = web3.toWei(2000, 'ether')
         const amountToBuy7 = web3.toWei(2000, 'ether')
         const amountToBuy8 = web3.toWei(2000, 'ether')
         const amountToBuy9 = web3.toWei(2000, 'ether')
         const expectedTokens = 50e24

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[0],
            gas: 4e6,
            value: amountToBuy
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[1],
            gas: 4e6,
            value: amountToBuy2
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[2],
            gas: 4e6,
            value: amountToBuy3
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[3],
            gas: 4e6,
            value: amountToBuy4
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[4],
            gas: 4e6,
            value: amountToBuy5
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[5],
            gas: 4e6,
            value: amountToBuy6
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[6],
            gas: 4e6,
            value: amountToBuy7
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[7],
            gas: 4e6,
            value: amountToBuy8
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[8],
            gas: 4e6,
            value: amountToBuy9
         })

         setTimeout(async () => {
            const tokensRaised = (await crowdsaleInstance.tokensRaised()).toString()

            assert.equal(tokensRaised, expectedTokens, 'The tokens raised are not correct')

            resolve()
         }, 5e3)
      })
   })

   // Create a new instance of token and crowdsale with the endtime modified to 5 seconds
   it("Should enable refunds when the crowdsale time is over", () => {
      return new Promise(async (resolve, reject) => {
         const times = new Date()

         const startTime = Math.floor(new Date().getTime() / 1000)

         // Set the actual time + 5 seconds
         const endTime = Math.floor(times.setSeconds(times.getSeconds() + 5) / 1000)

         tokenInstance = await PallyCoin.new()
         crowdsaleInstance = await Crowdsale.new(web3.eth.accounts[0], tokenInstance.address, startTime, endTime, {
            from: web3.eth.accounts[0],
            gas: 4e6
         })

         await tokenInstance.setCrowdsaleAddress(crowdsaleInstance.address, {
            from: web3.eth.accounts[0],
            gas: 4e6
         })

         await crowdsaleInstance.setTierRates(rateTier1, rateTier2, rateTier3, rateTier4, {
            from: web3.eth.accounts[0],
            gas: 4e6
         })

         // Wait until the crowdsale is ended
         setTimeout(async () => {

            // Call the checkCompletedCrowdsale() to activate the refunding mode
            await crowdsaleInstance.checkCompletedCrowdsale({
               from: web3.eth.accounts[0],
               gas: 4e6
            })

            setTimeout(async () => {

               // Check that the refund mode has been activated
               const isRefunding = await crowdsaleInstance.isRefunding()

               assert.equal(isRefunding, true, "The Crowdsale contracts is not refunding when it should")

               resolve()
            }, 3e3)
         }, 6e3)
      })
   })

   // Check that the initial token balance === final token balance
   it("Should refund the tokens of a purchase if the state is refunding with the claimRefund()", () => {
      return new Promise(async (resolve, reject) => {
         const times = new Date()
         const amountToBuy = web3.toWei(20, 'ether')
         const expectedTokens = getTokens(web3.toWei(20, 'ether'), rateTier1)
         const initialTokenBalance = await tokenInstance.balanceOf(web3.eth.accounts[0])

         const startTime = Math.floor(new Date().getTime() / 1000)

         // Set the actual time + 10 seconds
         const endTime = Math.floor(times.setSeconds(times.getSeconds() + 15) / 1000)

         // PallyCoin.new returns a promise so we can await for it
         tokenInstance = await PallyCoin.new()

         // Create a new instance with a modified end time
         crowdsaleInstance = await Crowdsale.new(web3.eth.accounts[0], tokenInstance.address, startTime, endTime, {
            from: web3.eth.accounts[0],
            gas: 4e6
         })

         await tokenInstance.setCrowdsaleAddress(crowdsaleInstance.address, {
            from: web3.eth.accounts[0],
            gas: 4e6
         })

         await crowdsaleInstance.setTierRates(rateTier1, rateTier2, rateTier3, rateTier4, {
            from: web3.eth.accounts[0],
            gas: 4.4e6
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[0],
            value: amountToBuy,
            gas: 4.5e6
         })

         // Wait until the crowdsale is ended
         setTimeout(async () => {
            const afterBuyingTokens = await tokenInstance.balanceOf(web3.eth.accounts[0])
            assert.equal(parseFloat(afterBuyingTokens), 40e24 + expectedTokens, "The after buying balance isn't correct")

            // Call the checkCompletedCrowdsale() to activate the refunding mode
            await crowdsaleInstance.checkCompletedCrowdsale({
               from: web3.eth.accounts[0],
               gas: 4e6
            })

            setTimeout(async () => {

               // It'll call the checkCompletedCrowdsale() to activate the refunding mode
               await crowdsaleInstance.claimRefund({
                  from: web3.eth.accounts[0],
                  gas: 3e6
               })

               setTimeout(async () => {
                  const finalTokenBalance = await tokenInstance.balanceOf(web3.eth.accounts[0])
                  assert.ok(finalTokenBalance.eq(initialTokenBalance), "The final balance isn't correct")

                  resolve()
               }, 2e3)
            }, 2e3)
         }, 15e3)
      })
   })

   // First deposit 1000 ether in the vault and the buy 500 to transfer the funds to the wallet
   // Check that the ether is forwarded to the wallet correctly
   it("Should close the refund vault and send the ether to the wallet after the minimum goal of 7.5M tokens is reached", () => {
      return new Promise(async (resolve, reject) => {
         let amountToBuy = web3.toWei(1000, 'ether')
         const amountToBuy2 = web3.toWei(500, 'ether')
         const wallet = web3.eth.accounts[2]
         let initialBalance = await web3.eth.getBalance(wallet)
         const times = new Date()
         const startTime = Math.floor(new Date().getTime() / 1000)
         const endTime = Math.floor(times.setSeconds(times.getSeconds() + 15) / 1000)

         // Create a new instance of the crowdsale to use a reduced time
         // and set a different wallet address to avoid gas charges
         tokenInstance = await PallyCoin.new()
         crowdsaleInstance = await Crowdsale.new(wallet, tokenInstance.address, startTime, endTime, {
            from: web3.eth.accounts[0],
            gas: 4e6
         })

         const vaultAddress = await crowdsaleInstance.vault()
         vaultInstance = web3.eth.contract(RefundVault.abi).at(vaultAddress)

         await tokenInstance.setCrowdsaleAddress(crowdsaleInstance.address, {
            from: web3.eth.accounts[0],
            gas: 4e6
         })

         await crowdsaleInstance.setTierRates(rateTier1, rateTier2, rateTier3, rateTier4, {
            from: web3.eth.accounts[0],
            gas: 4e6
         })

         assert.ok(parseFloat(await web3.eth.getBalance(web3.eth.accounts[0])) >= amountToBuy,
            `You don\'t have the balance to buy ${web3.fromWei(amountToBuy, 'ether')} ethers`)

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[0],
            gas: 4.5e6,
            value: amountToBuy
         })

         setTimeout(async () => {

            // Make sure that the tokens are in fact stored in the vault
            const vaultBalance = await web3.eth.getBalance(vaultInstance.address)
            amountToBuy = new web3.BigNumber(amountToBuy)

            assert.ok(amountToBuy.eq(vaultBalance), "The balance of the vault isn't correct")

            await crowdsaleInstance.buyTokens({
               from: web3.eth.accounts[0],
               gas: 4.4e6,
               value: amountToBuy2
            })

            setTimeout(async () => {

               // Forwards the vault's funds to the wallet after the crowdsale is ended
               await crowdsaleInstance.checkCompletedCrowdsale({ from: web3.eth.accounts[0], gas: 3e6 })

               setTimeout(async () => {
                  let finalBalance = new web3.BigNumber(await web3.eth.getBalance(wallet))
                  initialBalance = new web3.BigNumber(initialBalance)
                  const sum = initialBalance.add(amountToBuy).add(amountToBuy2)

                  // Final balance === initial + buy1 + buy2
                  assert.ok(sum, 'The balance is not correct after buying tokens')

                  resolve()
               }, 2e3)
            }, 12e3)
         }, 3e3)
      })
   })

   it("Should be pausable by the owner", () => {
      return new Promise(async (resolve, reject) => {
         await crowdsaleInstance.pause({
            from: web3.eth.accounts[0],
            gas: 4e6
         })

         const paused = await crowdsaleInstance.paused()

         assert.equal(paused, true, "The crowdsale smart contract should be paused")
         resolve()
      })
   })

   it("Should be able to unpause the contract by the owner", () => {
      return new Promise(async (resolve, reject) => {
         await crowdsaleInstance.pause({
            from: web3.eth.accounts[0],
            gas: 4e6
         })

         await crowdsaleInstance.unpause({
            from: web3.eth.accounts[0],
            gas: 4e6
         })

         const paused = await crowdsaleInstance.paused()

         assert.equal(paused, false, "The contract is paused when it shouldn't")
         resolve()
      })
   })

   it("Should not be able to pause the contract if you're not the owner", () => {
      return new Promise(async (resolve, reject) => {
         await crowdsaleInstance.pause({
            from: web3.eth.accounts[5],
            gas: 4e6
         })

         setTimeout(async () => {
            const paused = await crowdsaleInstance.paused()
            assert.equal(paused, false, "The contract is paused when it shouldn't")

            resolve()
         }, 2e3)
      })
   })

   it("Should not allow you to buy tokens when the contract is paused", () => {
      return new Promise(async (resolve, reject) => {
         const amountToBuy = web3.toWei(1, 'ether')
         const tokensExpected = 0

         await crowdsaleInstance.pause({
            from: web3.eth.accounts[0],
            gas: 4e6
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[0],
            gas: 4e6,
            value: amountToBuy
         })

         const tokensGenerated = parseInt(await crowdsaleInstance.tokensRaised())

         assert.equal(tokensExpected, tokensGenerated, "The tokens generated don't match the tokens expected")
         resolve()
      })
   })

   // Buy 1500 then 1000. It should only buy the remaining 500 and refund the other 500
   it("Should only allow you to buy a total of 2000 ether during the entire crowdsale per buyer", () => {
      return new Promise(async (resolve, reject) => {
         const amountToBuy = web3.toWei(1500, 'ether')
         const amountToBuy2 = web3.toWei(1000, 'ether')
         const expectedTokens = 10e24
         const initialTokens = await tokenInstance.balanceOf(web3.eth.accounts[0])

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[0],
            gas: 4e6,
            value: amountToBuy
         })

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[0],
            gas: 4e6,
            value: amountToBuy2
         })

         const finalTokens = await tokenInstance.balanceOf(web3.eth.accounts[0])

         assert.equal(parseFloat(finalTokens), parseFloat(initialTokens) + expectedTokens, "The expected tokens don't match the final balance")

         resolve()
      })
   })

   it("Should check if the goal of the crowdsale has been reached or not", () => {
      return new Promise(async (resolve, reject) => {
         const amountToBuy = web3.toWei(2000, 'ether') // 10 Million tokens
         let goalReached = await crowdsaleInstance.goalReached()

         goalReached.should.equal(false, "The goal reached must not be true without buying")

         await crowdsaleInstance.buyTokens({
            from: web3.eth.accounts[0],
            gas: 4e6,
            value: amountToBuy
         })

         setTimeout(async () => {
            goalReached = await crowdsaleInstance.goalReached()

            goalReached.should.equal(true, "The goal must be true because we've bought 10M tokens")

            resolve()
         }, 2e3)
      })
   })

   it("Should check if the crowdsale has ended or not", () => {
      return new Promise(async (resolve, reject) => {
         const hasEnded = await crowdsaleInstance.hasEnded()

         assert.equal(hasEnded, false, 'It must be not ended until October 30 at 00:00:00 or 12:00 pm')
         resolve()
      })
   })
})
