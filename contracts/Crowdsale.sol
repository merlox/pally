pragma solidity 0.4.15;

/**
 * @title SafeMath
 * @dev Math operations with safety checks that throw on error
 */
library SafeMath {
  function mul(uint256 a, uint256 b) internal constant returns (uint256) {
    uint256 c = a * b;
    assert(a == 0 || c / a == b);
    return c;
  }

  function div(uint256 a, uint256 b) internal constant returns (uint256) {
    // assert(b > 0); // Solidity automatically throws when dividing by 0
    uint256 c = a / b;
    // assert(a == b * c + a % b); // There is no case in which this doesn't hold
    return c;
  }

  function sub(uint256 a, uint256 b) internal constant returns (uint256) {
    assert(b <= a);
    return a - b;
  }

  function add(uint256 a, uint256 b) internal constant returns (uint256) {
    uint256 c = a + b;
    assert(c >= a);
    return c;
  }
}

/**
 * @title ERC20Basic
 * @dev Simpler version of ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/179
 */
contract ERC20Basic {
  uint256 public totalSupply;
  function balanceOf(address who) constant returns (uint256);
  function transfer(address to, uint256 value) returns (bool);
  event Transfer(address indexed from, address indexed to, uint256 value);
}

/**
 * @title ERC20 interface
 * @dev see https://github.com/ethereum/EIPs/issues/20
 */
contract ERC20 is ERC20Basic {
  function allowance(address owner, address spender) constant returns (uint256);
  function transferFrom(address from, address to, uint256 value) returns (bool);
  function approve(address spender, uint256 value) returns (bool);
  event Approval(address indexed owner, address indexed spender, uint256 value);
}


/**
 * @title Basic token
 * @dev Basic version of StandardToken, with no allowances.
 */
contract BasicToken is ERC20Basic {
  using SafeMath for uint256;

  mapping(address => uint256) balances;

  /**
  * @dev transfer token for a specified address
  * @param _to The address to transfer to.
  * @param _value The amount to be transferred.
  */
  function transfer(address _to, uint256 _value) returns (bool) {
    require(_to != address(0));

    // SafeMath.sub will throw if there is not enough balance.
    balances[msg.sender] = balances[msg.sender].sub(_value);
    balances[_to] = balances[_to].add(_value);
    Transfer(msg.sender, _to, _value);
    return true;
  }

   /**
   * @dev Gets the balance of the specified address.
   * @param _owner The address to query the the balance of.
   * @return An uint256 representing the amount owned by the passed address.
   */
   function balanceOf(address _owner) constant returns (uint256 balance) {
      return balances[_owner];
   }
}


/**
 * @title Standard ERC20 token
 *
 * @dev Implementation of the basic standard token.
 * @dev https://github.com/ethereum/EIPs/issues/20
 * @dev Based on code by FirstBlood: https://github.com/Firstbloodio/token/blob/master/smart_contract/FirstBloodToken.sol
 */
contract StandardToken is ERC20, BasicToken {

  mapping (address => mapping (address => uint256)) allowed;

  /**
   * @dev Transfer tokens from one address to another
   * @param _from address The address which you want to send tokens from
   * @param _to address The address which you want to transfer to
   * @param _value uint256 the amount of tokens to be transferred
   */
  function transferFrom(address _from, address _to, uint256 _value) returns (bool) {
    require(_to != address(0));

    var _allowance = allowed[_from][msg.sender];

    // Check is not needed because sub(_allowance, _value) will already throw if this condition is not met
    // require (_value <= _allowance);

    balances[_from] = balances[_from].sub(_value);
    balances[_to] = balances[_to].add(_value);
    allowed[_from][msg.sender] = _allowance.sub(_value);
    Transfer(_from, _to, _value);
    return true;
  }

  /**
   * @dev Approve the passed address to spend the specified amount of tokens on behalf of msg.sender.
   * @param _spender The address which will spend the funds.
   * @param _value The amount of tokens to be spent.
   */
  function approve(address _spender, uint256 _value) returns (bool) {

    // To change the approve amount you first have to reduce the addresses`
    //  allowance to zero by calling `approve(_spender, 0)` if it is not
    //  already 0 to mitigate the race condition described here:
    //  https://github.com/ethereum/EIPs/issues/20#issuecomment-263524729
    require((_value == 0) || (allowed[msg.sender][_spender] == 0));

    allowed[msg.sender][_spender] = _value;
    Approval(msg.sender, _spender, _value);
    return true;
  }

  /**
   * @dev Function to check the amount of tokens that an owner allowed to a spender.
   * @param _owner address The address which owns the funds.
   * @param _spender address The address which will spend the funds.
   * @return A uint256 specifying the amount of tokens still available for the spender.
   */
  function allowance(address _owner, address _spender) constant returns (uint256 remaining) {
    return allowed[_owner][_spender];
  }

  /**
   * approve should be called when allowed[_spender] == 0. To increment
   * allowed value is better to use this function to avoid 2 calls (and wait until
   * the first transaction is mined)
   * From MonolithDAO Token.sol
   */
  function increaseApproval (address _spender, uint _addedValue)
    returns (bool success) {
    allowed[msg.sender][_spender] = allowed[msg.sender][_spender].add(_addedValue);
    Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }

  function decreaseApproval (address _spender, uint _subtractedValue)
    returns (bool success) {
    uint oldValue = allowed[msg.sender][_spender];
    if (_subtractedValue > oldValue) {
      allowed[msg.sender][_spender] = 0;
    } else {
      allowed[msg.sender][_spender] = oldValue.sub(_subtractedValue);
    }
    Approval(msg.sender, _spender, allowed[msg.sender][_spender]);
    return true;
  }
}


/**
 * @title Ownable
 * @dev The Ownable contract has an owner address, and provides basic authorization control
 * functions, this simplifies the implementation of "user permissions".
 */
contract Ownable {
  address public owner;

  /**
   * @dev The Ownable constructor sets the original `owner` of the contract to the sender
   * account.
   */
  function Ownable() {
    owner = msg.sender;
  }

  /**
   * @dev Throws if called by any account other than the owner.
   */
  modifier onlyOwner() {
    require(msg.sender == owner);
    _;
  }

  /**
   * @dev Allows the current owner to transfer control of the contract to a newOwner.
   * @param newOwner The address to transfer ownership to.
   */
  function transferOwnership(address newOwner) onlyOwner {
    require(newOwner != address(0));
    owner = newOwner;
  }
}


/**
 * @title Pausable
 * @dev Base contract which allows children to implement an emergency stop mechanism.
 */
contract Pausable is Ownable {
  event Pause();
  event Unpause();

  bool public paused = false;

  /**
   * @dev modifier to allow actions only when the contract IS paused
   */
  modifier whenNotPaused() {
    require(!paused);
    _;
  }

  /**
   * @dev modifier to allow actions only when the contract IS NOT paused
   */
  modifier whenPaused() {
    require(paused);
    _;
  }

  /**
   * @dev called by the owner to pause, triggers stopped state
   */
  function pause() onlyOwner whenNotPaused {
    paused = true;
    Pause();
  }

  /**
   * @dev called by the owner to unpause, returns to normal state
   */
  function unpause() onlyOwner whenPaused {
    paused = false;
    Unpause();
  }
}

/**
 * @title Pausable token
 *
 * @dev StandardToken modified with pausable transfers.
 **/
contract PausableToken is StandardToken, Pausable {

  function transfer(address _to, uint256 _value) whenNotPaused returns (bool) {
    return super.transfer(_to, _value);
  }

  function transferFrom(address _from, address _to, uint256 _value) whenNotPaused returns (bool) {
    return super.transferFrom(_from, _to, _value);
  }
}


/// @title The PallyCoin
/// @author Merunas Grincalaitis
contract PallyCoin is PausableToken {
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
   function setCrowdsaleAddress(address _crowdsale) onlyOwner whenNotPaused {
      require(_crowdsale != address(0));

      crowdsale = _crowdsale;
   }

   /// @notice Distributes the presale tokens. Only the owner can do this
   /// @param _buyer The address of the buyer
   /// @param tokens The amount of tokens corresponding to that buyer
   function distributePresaleTokens(address _buyer, uint tokens) onlyOwner whenNotPaused {
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
   function distributeICOTokens(address _buyer, uint tokens) onlyCrowdsale whenNotPaused {
      require(_buyer != address(0));
      require(tokens > 0);

      // Check that the limit of 50M ICO tokens hasn't been met yet
      require(tokensDistributedCrowdsale < 50000000);

      tokensDistributedCrowdsale = tokensDistributedCrowdsale.add(tokens);
      balances[_buyer] = balances[_buyer].add(tokens);
   }
}


/// @title Crowdsale contract to carry out an ICO with the PallyCoin
/// Crowdsales have a start and end timestamps, where investors can make
/// token purchases and the crowdsale will assign them tokens based
/// on a token per ETH rate. Funds collected are forwarded to a wallet
/// as they arrive.
/// @author Merunas Grincalaitis <merunasgrincalaitis@gmail.com>
contract Crowdsale is PallyCoin {
   using SafeMath for uint256;

   // The token being sold
   PallyCoin public token;

   // The block number of when the crowdsale starts
   // TODO Change this because it's a testing time
   uint256 public constant startTime = 1504224000;

   // The block number of when the crowdsale ends
   // 11/13/2017 @ 11:00am (UTC)
   // 11/13/2017 @ 12:00pm (GMT + 1)
   uint256 public constant endTime = 1510570800;

   // The wallet that holds the Wei raised on the crowdsale
   address public wallet;

   // The rate of tokens per ether. Only applied for the first tier, the first
   // 12.5 million tokens sold
   uint256 public rate;

   // The rate of tokens per ether. Only applied for the second tier, at between
   // 12.5 million tokens sold and 25 million tokens sold
   uint256 public rateTier2;

   // The rate of tokens per ether. Only applied for the third tier, at between
   // 25 million tokens sold and 37.5 million tokens sold
   uint256 public rateTier3;

   // The rate of tokens per ether. Only applied for the fourth tier, at between
   // 37.5 million tokens sold and 50 million tokens sold
   uint256 public rateTier4;

   // The amount of wei raised
   uint256 public weiRaised = 0;

   // The amount of tokens raised
   uint256 public tokensRaised = 0;

   // You can only buy up to 50 M tokens during the ICO
   uint256 public constant maxTokensRaised = 50000000;

   // The minimum amount of Wei you must pay to participate in the crowdsale
   uint256 public minPurchase = 100 finney; // 0.1 ether

   // The max amount of Wei that you can pay to participate in the crowdsale
   uint256 public maxPurchase = 2000 ether;

   // If the crowdsale is still active or if it's ended
   bool public crowdsaleEnded = false;

   // To indicate who purchased what amount of tokens and who received what amount of wei
   event TokenPurchase(address indexed purchaser, address indexed beneficiary, uint256 value, uint256 amount);

   // Indicates if the crowdsale has ended
   event Finalized();

   /// @notice Constructor of the crowsale to set up the main variables and create a token
   /// The constructor need ether to be able to distribute the tokens by calling the PallyCoin
   /// token smart contract
   /// @param _wallet The wallet address that stores the Wei raised
   /// @param _tokenAddress The token used for the ICO
   function Crowdsale(
      address _wallet,
      address _tokenAddress
   ) payable {
      require(_wallet != address(0));
      require(_tokenAddress != address(0));

      token = PallyCoin(_tokenAddress);
      wallet = _wallet;
   }

   /// @notice Fallback function to buy tokens
   function () payable {
      buyTokens(msg.sender);
   }

   /// @notice To buy tokens given an address
   /// @param beneficiary The address that will get the tokens
   function buyTokens(address beneficiary) payable {
      require(beneficiary != address(0));
      require(validPurchase());

      uint256 tokens = 0;

      if(tokensRaised < 12500000) {

         // Tier 1
         tokens = msg.value.mul(rate).div(1e18);

         // If the amount of tokens that you want to buy gets out of this tier
         if(tokensRaised.add(tokens) > 12500000)
            tokens = calculateExcessTokens(msg.value, 12500000, 1, rate);
      } else if(tokensRaised >= 12500000 && tokensRaised < 25000000) {

         // Tier 2
         tokens = msg.value.mul(rateTier2).div(1e18);

         // If the amount of tokens that you want to buy gets out of this tier
         if(tokensRaised.add(tokens) > 25000000)
            tokens = calculateExcessTokens(msg.value, 25000000, 2, rateTier2);
      } else if(tokensRaised >= 25000000 && tokensRaised < 37500000) {

         // Tier 3
         tokens = msg.value.mul(rateTier3).div(1e18);

         // If the amount of tokens that you want to buy gets out of this tier
         if(tokensRaised.add(tokens) > 37500000)
            tokens = calculateExcessTokens(msg.value, 37500000, 3, rateTier3);
      } else if(tokensRaised >= 37500000 && tokensRaised <= maxTokensRaised) {

         // Tier 4
         tokens = msg.value.mul(rateTier4).div(1e18);

         // If the amount of tokens that you want to buy gets out of this tier
         if(tokensRaised.add(tokens) > maxTokensRaised)
            tokens = calculateExcessTokens(msg.value, maxTokensRaised, 4, rateTier4);
      }

      weiRaised = weiRaised.add(msg.value);
      tokensRaised = tokensRaised.add(tokens);
      token.distributeICOTokens(beneficiary, tokens);
      TokenPurchase(msg.sender, beneficiary, msg.value, tokens);

      wallet.transfer(msg.value);
   }

   /// @notice Buys the tokens for the specified tier and for the next one
   /// @param amount The amount of ether paid to buy the tokens
   /// @param tokensThisTier The limit of tokens of that tier
   /// @param tierSelected The tier selected
   /// @param _rate The rate used for that `tierSelected`
   /// @return uint The total amount of tokens bought combining the tier prices
   function calculateExcessTokens(
      uint256 amount,
      uint256 tokensThisTier,
      uint256 tierSelected,
      uint256 _rate
   ) public constant returns(uint256 totalTokens) {
      uint weiThisTier = tokensThisTier.sub(tokensRaised).mul(1e18).div(_rate);
      uint weiNextTier = amount.sub(weiThisTier);
      uint tokensNextTier;

      // If there's excessive wei for the last tier, refund those
      if(tierSelected == 4)
         msg.sender.transfer(weiNextTier);
      else
         tokensNextTier = calculateTokensTier(weiNextTier, tierSelected.add(1));

      totalTokens = tokensThisTier.sub(tokensRaised).add(tokensNextTier);
   }

   /// @notice Buys the tokens given the price of the tier one and the wei paid
   /// @param weiPaid The amount of wei paid that will be used to buy tokens
   /// @param tierSelected The tier that you'll use for thir purchase
   /// @return tokensBought Returns how many tokens you've bought for that wei paid
   function calculateTokensTier(uint256 weiPaid, uint256 tierSelected) internal constant returns(uint256 tokensBought){
      require(weiPaid > 0);
      require(tierSelected >= 1 && tierSelected <= 4);

      if(tierSelected == 1)
         tokensBought = weiPaid.mul(rate).div(1e18);
      else if(tierSelected == 2)
         tokensBought = weiPaid.mul(rateTier2).div(1e18);
      else if(tierSelected == 3)
         tokensBought = weiPaid.mul(rateTier3).div(1e18);
      else
         tokensBought = weiPaid.mul(rateTier4).div(1e18);
   }

   /// @notice Set's the rate of tokens per ether for each tier. Use it after the
   /// smart contract is deployed to set the price according to the ether price
   /// at the start of the ICO
   /// @param tier1 The amount of tokens you get in the tier one
   /// @param tier2 The amount of tokens you get in the tier two
   /// @param tier3 The amount of tokens you get in the tier three
   /// @param tier4 The amount of tokens you get in the tier four
   function setTierRates(uint256 tier1, uint256 tier2, uint256 tier3, uint256 tier4) external onlyOwner {
      require(tier1 > 0 && tier2 > 0 && tier3 > 0 && tier4 > 0);

      rate = tier1;
      rateTier2 = tier2;
      rateTier3 = tier3;
      rateTier4 = tier4;
   }

   /// @notice Checks if a purchase is considered valid
   /// @return bool If the purchase is valid or not
   function validPurchase() internal constant returns(bool) {
      bool withinPeriod = now >= startTime && now <= endTime;
      bool nonZeroPurchase = msg.value > 0;
      bool withinPurchaseRanges = msg.value >= minPurchase && msg.value <= maxPurchase;
      bool withinTokenLimit = tokensRaised < maxTokensRaised;

      return withinPeriod && nonZeroPurchase && withinPurchaseRanges && withinTokenLimit;
   }

   /// @notice Public function to check if the crowdsale has ended or not
   function hasEnded() public constant returns(bool) {
      return now > endTime;
   }
}
