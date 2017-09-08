pragma solidity 0.4.15;

import 'zeppelin-solidity/contracts/math/SafeMath.sol';
import 'zeppelin-solidity/contracts/token/PausableToken.sol';

/// @title The PallyCoin
/// @author Merunas Grincalaitis
contract PallyCoin is PausableToken {
   using SafeMath for uint256;
   
   string public name = 'PallyCoin';

   string public constant symbol = 'PAL';

   uint8 public constant decimals = 18;

   uint256 public constant totalSupply = 100000000; // 100 M

   // The tokens already used for the presale buyers
   uint256 public tokensDistributedPresale = 0;

   // The tokens already used for the ICO buyers
   uint256 public tokensDistributedCrowdsale = 0;

   address public crowdsale;

   /// @notice Only allows the execution of the function if it's comming from crowdsale
   modifier onlyCrowdsale() {
      require(msg.sender == crowdsale);
      _;
   }

   /// @notice Constructor used to set the platform & development tokens. This is
   /// The 20% + 20% of the 100 M tokens used for platform and development team.
   /// The owner, msg.sender, is able to do allowance for other contracts. Remember
   /// to use `transferFrom()` if you're allowed
   function PallyCoin() {
      balances[msg.sender] = 40000000;
   }

   /// @notice Function to set the crowdsale smart contract's address only by the owner of this token
   /// @param _crowdsale The address that will be used
   function setCrowdsaleAddress(address _crowdsale) external onlyOwner whenNotPaused {
      require(_crowdsale != address(0));

      crowdsale = _crowdsale;
   }

   /// @notice Distributes the presale tokens. Only the owner can do this
   /// @param _buyer The address of the buyer
   /// @param tokens The amount of tokens corresponding to that buyer
   function distributePresaleTokens(address _buyer, uint tokens) external onlyOwner whenNotPaused {
      require(_buyer != address(0));
      require(tokens > 0);

      // Check that the limit of 10M presale tokens hasn't been met yet
      require(tokensDistributedPresale < 10000000);

      tokensDistributedPresale = tokensDistributedPresale.add(tokens);
      balances[_buyer] = balances[_buyer].add(tokens);
   }

   /// @notice Distributes the ICO tokens. Only the crowdsale address can execute this
   /// @param _buyer The buyer address
   /// @param tokens The amount of tokens to send to that address
   function distributeICOTokens(address _buyer, uint tokens) external onlyCrowdsale whenNotPaused {
      require(_buyer != address(0));
      require(tokens > 0);

      // Check that the limit of 50M ICO tokens hasn't been met yet
      require(tokensDistributedCrowdsale < 50000000);

      tokensDistributedCrowdsale = tokensDistributedCrowdsale.add(tokens);
      balances[_buyer] = balances[_buyer].add(tokens);
   }
}
