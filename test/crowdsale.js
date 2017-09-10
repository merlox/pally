const assert = require('assert')
const PallyCoin = artifacts.require('PallyCoin')
const Crowdsale = artifacts.require('Crowdsale')
const RefundVault = artifacts.require('RefundVault')
let tokenInstance = {}
let crowdsaleInstance = {}

function getTokens(weiAmount, rate) {
   return weiAmount * rate / 1e18
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

   before(cb => {
      console.log('Preparing contracts for the tests...')

      crowdsaleInstance = web3.eth.contract(Crowdsale.abi).at(Crowdsale.address)
      tokenInstance = web3.eth.contract(PallyCoin.abi).at(crowdsaleInstance.token())
      tokenInstance.setCrowdsaleAddress(crowdsaleInstance.address, {
         from: web3.eth.accounts[0],
         gas: 4e6
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

   it("Should set the vault wallet address correctly", cb => {
      crowdsaleInstance.vault((err, vaultAddress) => {
         let vaultInstance = web3.eth.contract(RefundVault.abi).at(vaultAddress)

         vaultInstance.wallet((err, wallet) => {
            console.log('Vault wallet address --> ' + wallet)

            assert.equal(wallet, web3.eth.accounts[0], 'The wallet address of the vault isn\'t correct')

            cb()
         })
      })
   })

   it("Should set the tier rates of the crowdsale instance correctly", cb => {
      crowdsaleInstance.setTierRates(rateTier1, rateTier2, rateTier3, rateTier4, {
         from: web3.eth.accounts[0],
         gas: 3000000
      }, (err, result) => {
         setTimeout(() => {
            crowdsaleInstance.rate((err, rate1) => {
               rate1 = parseInt(rate1)

               crowdsaleInstance.rateTier2((err, rate2) => {
                  rate2 = parseInt(rate2)

                  crowdsaleInstance.rateTier3((err, rate3) => {
                     rate3 = parseInt(rate3)

                     crowdsaleInstance.rateTier4((err, rate4) => {
                        rate4 = parseInt(rate4)

                        assert.equal(rate1, rateTier1, 'The rate 1 is not correctly set')
                        assert.equal(rate2, rateTier2, 'The rate 2 is not correctly set')
                        assert.equal(rate3, rateTier3, 'The rate 3 is not correctly set')
                        assert.equal(rate4, rateTier4, 'The rate 4 is not correctly set')

                        cb()
                     })
                  })
               })
            })
         }, 2e3)
      })
   })

   it("Should buy 10 million tokens for 2000 ether at rate 5000 with the buyTokens function", cb => {
      const amountToBuy = web3.toWei(2000, 'ether')
      const tokensToBuy = getTokens(amountToBuy, rateTier1)
      const expectedTokens = tokensToBuy
      let initialTokenBalance

      web3.eth.getBalance(web3.eth.accounts[0], (err, balance) => {
         assert.equal(true, balance > amountToBuy, `You don\'t have the balance to buy ${web3.fromWei(amountToBuy, 'ether')} ethers`)

         tokenInstance.balanceOf(web3.eth.accounts[0], (err, myBalance) => {
            initialTokenBalance = parseInt(myBalance)

            crowdsaleInstance.buyTokens(web3.eth.accounts[0], {
               from: web3.eth.accounts[0],
               gas: 4e6,
               value: amountToBuy
            }, (err, transaction) => {
               setTimeout(() => {
                  tokenInstance.balanceOf(web3.eth.accounts[0], (err, myBalance) => {
                     crowdsaleInstance.tokensRaised((err, tokens) => {
                        console.log('Tokens raised --> ' + tokens.toString())
                        console.log('Expected tokens --> ' + expectedTokens)

                        assert.equal(tokens.toString(), expectedTokens, 'The tokens raised are not correct')
                        assert.equal(initialTokenBalance + tokensToBuy, parseInt(myBalance), 'The balance is not correct after buying tokens')

                        cb()
                     })
                  })
               }, 5e3)
            })
         })
      })
   })

   // The order of the tests is important because this one assumes that there's
   // already 10 million tokens raised in order to test correctly
   it("Should calculate the excess tokens correctly with the proper rates, buy 1000 ether + 2000 past ether returning 14.5M instead of 15M", cb => {
      const amountToBuy = web3.toWei(1000, 'ether')
      const expectedTokens = getTokens(web3.toWei(2500, 'ether'), rateTier1) + getTokens(web3.toWei(500, 'ether'), rateTier2)

      crowdsaleInstance.calculateExcessTokens(amountToBuy, 12500000, 1, rateTier1, {
         from: web3.eth.accounts[0],
         gas: 4000000
      }, (err, secondPurchaseTokens) => {
         secondPurchaseTokens = parseInt(secondPurchaseTokens)
         assert.equal(getTokens(web3.toWei(2000, 'ether'), 5000) + secondPurchaseTokens, expectedTokens, "The tokens received aren't correct")

         cb()
      })
   })

   it("Should buy 14.5 million tokens for an additional 1000 ether (including the past test tokens) at rate 5000 tier 1 and 4000 tier 2 with the buyTokens function", cb => {

      // You can't buy more than 2000 ether as defined by maxPurchase so we split it
      const amountToBuy = web3.toWei(1000, 'ether')
      const expectedTokens = (web3.toWei(2500, 'ether') * rateTier1 / 1e18) + (web3.toWei(500, 'ether') * rateTier2 / 1e18)
      const tokensToBuy = 4.5e6
      let initialTokenBalance

      // 2500 at tier 1 rate 5000 = 12.5 Million tokens
      // 500 at tier 2 rate 4000 = 2 Million tokens

      web3.eth.getBalance(web3.eth.accounts[0], (err, balance) => {
         assert.equal(true, balance > amountToBuy, `You don\'t have the balance to buy ${web3.fromWei(amountToBuy, 'ether')} ethers`)

         tokenInstance.balanceOf(web3.eth.accounts[0], (err, myBalance) => {
            initialTokenBalance = parseInt(myBalance)

            console.log('Initial token balance ' + parseInt(myBalance))

            crowdsaleInstance.buyTokens(web3.eth.accounts[0], {
               from: web3.eth.accounts[0],
               gas: 4500000,
               value: amountToBuy
            }, (err, transaction) => {

               // Set timeout required to have time to mine the transaction
               setTimeout(() => {
                  tokenInstance.balanceOf(web3.eth.accounts[0], (err, myBalance) => {
                     crowdsaleInstance.tokensRaised((err, tokens) => {
                        console.log('Tokens raised --> ' + tokens.toString())
                        console.log('Final token balance ' + parseInt(myBalance))

                        assert.equal(tokens.toString(), expectedTokens, 'The tokens raised are not correct')
                        assert.equal(initialTokenBalance + tokensToBuy, parseInt(myBalance), 'The balance is not correct after buying tokens')

                        cb()
                     })
                  })
               }, 2e3)
            })
         })
      })
   })

   it("Should buy 34 million tokens for an additional 2000 + 2000 ether (including the past test tokens) at rate 5000 tier 1, 4000 tier 2 and 3000 tier 3 with the buyTokens function", cb => {

      // You can't buy more than 2000 ether as defined by maxPurchase so we split it
      const amountToBuy = web3.toWei(2000, 'ether')
      const amountToBuy2 = web3.toWei(2000, 'ether')
      const amountToBuy3 = web3.toWei(1625, 'ether')
      const tokensToBuy = 19.5e6
      const expectedTokens =
         (web3.toWei(2500, 'ether') * rateTier1 / 1e18) + // Past purchase of tokens
         (web3.toWei(500, 'ether') * rateTier2 / 1e18) + // Past purchase of tokens 14.5M
         (web3.toWei(2625, 'ether') * rateTier2 / 1e18) +
         (web3.toWei(3000, 'ether') * rateTier3 / 1e18)

      // 14.5M at rate1 + rate2
      // + 10.5M at rate2 = 2625 ether
      // + 9M at rate3 = 3000 ether
      let initialTokenBalance

      web3.eth.getBalance(web3.eth.accounts[0], (err, balance) => {
         assert.equal(true, balance > amountToBuy, `You don\'t have the balance to buy ${web3.fromWei(amountToBuy, 'ether')} ethers`)

         tokenInstance.balanceOf(web3.eth.accounts[0], (err, myBalance) => {
            initialTokenBalance = parseInt(myBalance)

            console.log('Initial token balance ' + parseInt(myBalance))

            crowdsaleInstance.buyTokens(web3.eth.accounts[0], {
               from: web3.eth.accounts[0],
               gas: 4500000,
               value: amountToBuy
            }, (err, transaction) => {

               setTimeout(() => {
                  crowdsaleInstance.buyTokens(web3.eth.accounts[0], {
                     from: web3.eth.accounts[0],
                     gas: 4500000,
                     value: amountToBuy3
                  }, (err, transaction) => {

                     setTimeout(() => {
                        crowdsaleInstance.buyTokens(web3.eth.accounts[0], {
                           from: web3.eth.accounts[0],
                           gas: 4500000,
                           value: amountToBuy2
                        }, (err, transaction) => {

                           setTimeout(() => {
                              tokenInstance.balanceOf(web3.eth.accounts[0], (err, myBalance) => {
                                 crowdsaleInstance.tokensRaised((err, tokens) => {
                                    console.log('Tokens raised --> ' + tokens.toString())
                                    console.log('Final token balance ' + parseInt(myBalance))

                                    assert.equal(tokens.toString(), expectedTokens, 'The tokens raised are not correct')
                                    assert.equal(initialTokenBalance + tokensToBuy, parseInt(myBalance), 'The balance is not correct after buying tokens')

                                    cb()
                                 })
                              })
                           }, 2e3)
                        })
                     }, 2e3)
                  })
               }, 2e3)
            })
         })
      })
   })

   // Checking that the balanceOf stays the same because the transaction was reverted
   it("Should not allow you to buy 3000 ether, more than the maxPurchase of 2000 ether", cb => {
      const amountToBuy = web3.toWei(3000, 'ether')

      web3.eth.getBalance(web3.eth.accounts[0], (err, balance) => {
         assert.equal(true, balance > amountToBuy, `You don\'t have the balance to buy ${web3.fromWei(amountToBuy, 'ether')} ethers`)

         tokenInstance.balanceOf(web3.eth.accounts[0], (err, myBalance) => {
            const initialTokenBalance = parseInt(myBalance)

            console.log('Initial token balance ' + parseInt(myBalance))

            crowdsaleInstance.buyTokens(web3.eth.accounts[0], {
               from: web3.eth.accounts[0],
               gas: 4500000,
               value: amountToBuy
            }, (err, transaction) => {

               // Set timeout required to have time to mine the transaction
               setTimeout(() => {
                  tokenInstance.balanceOf(web3.eth.accounts[0], (err, myBalance) => {
                     console.log('Final token balance ' + parseInt(myBalance))

                     assert.equal(initialTokenBalance, parseInt(myBalance), 'The balance is not correct after buying tokens')

                     cb()
                  })
               }, 2e3)
            })
         })
      })
   })

   // Checking that the balanceOf stays the same because the transaction was reverted
   it("Should not allow you to buy less than 0.1 ether, minPurchase", cb => {
      const amountToBuy = web3.toWei(0.001, 'ether')

      web3.eth.getBalance(web3.eth.accounts[0], (err, balance) => {
         assert.equal(true, balance > amountToBuy, `You don\'t have the balance to buy ${web3.fromWei(amountToBuy, 'ether')} ethers`)

         tokenInstance.balanceOf(web3.eth.accounts[0], (err, myBalance) => {
            const initialTokenBalance = parseInt(myBalance)

            console.log('Initial token balance ' + parseInt(myBalance))

            crowdsaleInstance.buyTokens(web3.eth.accounts[0], {
               from: web3.eth.accounts[0],
               gas: 4500000,
               value: amountToBuy
            }, (err, transaction) => {

               // Set timeout required to have time to mine the transaction
               setTimeout(() => {
                  tokenInstance.balanceOf(web3.eth.accounts[0], (err, myBalance) => {
                     console.log('Final token balance ' + parseInt(myBalance))

                     assert.equal(initialTokenBalance, parseInt(myBalance), 'The balance is not correct after buying tokens')

                     cb()
                  })
               }, 2e3)
            })
         })
      })
   })

   it("Should buy 50 million tokens for an additional 2000 + 2000 + 2000 + 250 ether (including the past test tokens) with the buyTokens function", cb => {

      // 37.5m - 34m = 3.5m tokens at tier3 = 1166 ether = 3500000 / rateTier3
      // 12.5m at tier4 = 6.250 ether

      // You can't buy more than 2000 ether as defined by maxPurchase so we split it
      const amountToBuy = web3.toWei(3500000 / rateTier3, 'ether')
      const amountToBuy2 = web3.toWei(2000, 'ether')
      const amountToBuy3 = web3.toWei(2000, 'ether')
      const amountToBuy4 = web3.toWei(2000, 'ether')
      const amountToBuy5 = web3.toWei(250, 'ether')
      const tokensToBuy = 16e6
      const expectedTokens =
         getTokens(web3.toWei(2500, 'ether'), rateTier1) + // Past purchase of tokens
         getTokens(web3.toWei(3125, 'ether'), rateTier2) + // Past purchase of tokens
         getTokens(web3.toWei(3000, 'ether'), rateTier3) + // Past purchase of tokens
         3500000 + // 3.5M tokens
         getTokens(web3.toWei(6250, 'ether'), rateTier4)

      let initialTokenBalance

      web3.eth.getBalance(web3.eth.accounts[0], (err, balance) => {
         assert.equal(true, balance > amountToBuy, `You don\'t have the balance to buy ${web3.fromWei(amountToBuy, 'ether')} ethers`)

         tokenInstance.balanceOf(web3.eth.accounts[0], (err, myBalance) => {
            initialTokenBalance = parseInt(myBalance)

            console.log('Initial token balance ' + parseInt(myBalance))

            crowdsaleInstance.buyTokens(web3.eth.accounts[0], {
               from: web3.eth.accounts[0],
               gas: 4500000,
               value: amountToBuy
            }, (err, transaction) => {

               setTimeout(() => {
                  crowdsaleInstance.buyTokens(web3.eth.accounts[0], {
                     from: web3.eth.accounts[0],
                     gas: 4500000,
                     value: amountToBuy2
                  }, (err, transaction) => {

                     setTimeout(() => {
                        crowdsaleInstance.buyTokens(web3.eth.accounts[0], {
                           from: web3.eth.accounts[0],
                           gas: 4500000,
                           value: amountToBuy3
                        }, (err, transaction) => {

                           setTimeout(() => {
                              crowdsaleInstance.buyTokens(web3.eth.accounts[0], {
                                 from: web3.eth.accounts[0],
                                 gas: 4500000,
                                 value: amountToBuy4
                              }, (err, transaction) => {

                                 setTimeout(() => {
                                    crowdsaleInstance.buyTokens(web3.eth.accounts[0], {
                                       from: web3.eth.accounts[0],
                                       gas: 4500000,
                                       value: amountToBuy5
                                    }, (err, transaction) => {

                                       setTimeout(() => {
                                          tokenInstance.balanceOf(web3.eth.accounts[0], (err, myBalance) => {
                                             crowdsaleInstance.tokensRaised((err, tokens) => {
                                                console.log('Tokens raised --> ' + tokens.toString())
                                                console.log('Final token balance ' + parseInt(myBalance))

                                                assert.equal(tokens.toString(), expectedTokens, 'The tokens raised are not correct')
                                                assert.equal(initialTokenBalance + tokensToBuy, parseInt(myBalance), 'The balance is not correct after buying tokens')

                                                cb()
                                             })
                                          })
                                       }, 2e3)
                                    })
                                 }, 2e3)
                              })
                           }, 2e3)
                        })
                     }, 2e3)
                  })
               }, 2e3)
            })
         })
      })
   })

   // Checking that the balanceOf stays the same because the transaction was reverted
   it("Should not buy more than 50 million tokens", cb => {

      // We have 50 million tokens from the past purchase, try to buy more
      const amountToBuy = web3.toWei(1000, 'ether')
      const expectedTokens = 50e6

      web3.eth.getBalance(web3.eth.accounts[0], (err, balance) => {
         assert.equal(true, balance > amountToBuy, `You don\'t have the balance to buy ${web3.fromWei(amountToBuy, 'ether')} ethers`)

         tokenInstance.balanceOf(web3.eth.accounts[0], (err, myBalance) => {
            initialTokenBalance = parseInt(myBalance)

            console.log('Initial token balance ' + parseInt(myBalance))

            crowdsaleInstance.buyTokens(web3.eth.accounts[0], {
               from: web3.eth.accounts[0],
               gas: 4500000,
               value: amountToBuy
            }, (err, transaction) => {

               setTimeout(() => {
                  crowdsaleInstance.tokensRaised((err, tokens) => {
                     tokens = tokens.toString()

                     tokenInstance.balanceOf(web3.eth.accounts[0], (err, myBalance) => {
                        console.log('Final token balance ' + parseInt(myBalance))

                        assert.equal(tokens.toString(), expectedTokens, 'The tokens raised are not correct')
                        assert.equal(initialTokenBalance, parseInt(myBalance), 'The balance is not correct after buying tokens')

                        cb()
                     })
                  })
               }, 2e3)
            })
         })
      })
   })

   // it("Should enable refunds when the crowdsale time is over", async cb => {
   //    const times = new Date()
   //
   //    // Set the actual time + 5 seconds
   //    const endTime = Math.floor(times.setSeconds(times.getSeconds() + 5) / 1000)
   //
   //    // PallyCoin.new returns a promise so we can await for it
   //    let token = await PallyCoin.new(web3.eth.accounts[0])
   //
   //    // Create a new instance with a modified end time
   //    let crowdsale = await Crowdsale.new(web3.eth.accounts[0], token.address, endTime)
   //
   //    await token.setCrowdsaleAddress(crowdsale.address, {
   //       from: web3.eth.accounts[0],
   //       gas: 4e6
   //    })
   //
   //    await crowdsale.setTierRates(rateTier1, rateTier2, rateTier3, rateTier4, {
   //       from: web3.eth.accounts[0],
   //       gas: 3000000
   //    })
   //
   //    // Wait until the crowdsale is ended
   //    setTimeout(() => {
   //
   //       // Call the checkCompletedCrowdsale() to activate the refunding mode
   //       await crowdsale.checkCompletedCrowdsale({
   //          from: web3.eth.accounts[0],
   //          gas: 4e3
   //       })
   //
   //       // Give it time to mine the changes
   //       setTimeout(() => {
   //
   //          // Check that the refund mode has been activated
   //          let isRefunding = await crowdsale.isRefunding()
   //
   //          console.log('Is refunding? ' + isRefunding)
   //          assert.equal(true, isRefunding, "The Crowdsale contracts is not refunding when it should")
   //
   //          cb()
   //       }, 2e3)
   //    }, 6e3)
   // })

   // it("Should refund the ether of a purchase if the state is refunding with the claimRefund()", cb => {
   //    const times = new Date()
   //
   //    // Set the actual time + 5 second
   //    const endTime = Math.floor(times.setSeconds(times.getSeconds() + 5) / 1000)
   //
   //    // Create a new instance with a modifier end time
   //    let contract = web3.eth.contract(Crowdsale.abi).new(web3.eth.accounts[0], PallyCoin.address, endTime, {
   //       from: web3.eth.accounts[0],
   //       gas: 4e6
   //    })
   //
   //    contract.buyTokens
   //
   //    // Wait until the time is over
   //    setTimeout(() => {
   //
   //       // Call the checkCompletedCrowdsale() to activate the mode
   //       constract.checkCompletedCrowdsale({
   //          from: web3.eth.accounts[0],
   //          gas: 4e3
   //       }, (err, response) => {
   //
   //          // Give it time to mine the changes
   //          setTimeout(() => {
   //
   //             // Check that the refund mode has been activated
   //             contract.claimRefund((err, isRefunding) => {
   //                console.log('Is refunding? ' + isRefunding)
   //
   //                assert.equal(true, isRefunding, "The Crowdsale contracts is not refunding when it should")
   //
   //                cb()
   //             })
   //          }, 2e3)
   //       })
   //    }, 2e3)
   // })

   it("Should close the refund vault and send the ether to the wallet")

   it("Should be able to pause the contract by the owner")

   it("Should be able to unpause the contract by the owner")

   it("Should not be able to pause the contract if you're not the owner")

   it("Should not allow to buy tokens when the contract is paused")

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
