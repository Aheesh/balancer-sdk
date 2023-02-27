export enum BalancerErrorCode {
  EXIT_DELTA_AMOUNTS = 'EXIT_DELTA_AMOUNTS',
  FEE_PROVIDER_NOT_PROVIDED = 'FEE_PROVIDER_NOT_PROVIDED',
  GAUGES_HELPER_ADDRESS_NOT_PROVIDED = 'GAUGES_HELPER_ADDRESS_NOT_PROVIDED',
  GAUGES_NOT_FOUND = 'GAUGES_NOT_FOUND',
  GAUGES_REWARD_MINTER_ADDRESS_NOT_PROVIDED = 'GAUGES_REWARD_MINTER_ADDRESS_NOT_PROVIDED',
  GAUGES_REWARD_TOKEN_EMPTY = 'GAUGES_REWARD_TOKEN_EMPTY',
  ILLEGAL_PARAMETER = 'ILLEGAL_PARAMETER',
  INPUT_LENGTH_MISMATCH = 'INPUT_LENGTH_MISMATCH',
  INPUT_OUT_OF_BOUNDS = 'INPUT_OUT_OF_BOUNDS',
  INPUT_TOKEN_INVALID = 'INPUT_TOKEN_INVALID',
  INPUT_ZERO_NOT_ALLOWED = 'INPUT_ZERO_NOT_ALLOWED',
  INTERNAL_ERROR_INVALID_ABI = 'INTERNAL_ERROR_INVALID_ABI',
  JOIN_DELTA_AMOUNTS = 'JOIN_DELTA_AMOUNTS',
  MISSING_AMP = 'MISSING_AMP',
  MISSING_DECIMALS = 'MISSING_DECIMALS',
  MISSING_LAST_JOIN_EXIT_INVARIANT = 'MISSING_LAST_JOIN_EXIT_INVARIANT',
  MISSING_PRICE_RATE = 'MISSING_PRICE_RATE',
  MISSING_TOKENS = 'MISSING_TOKENS',
  MISSING_WEIGHT = 'MISSING_WEIGHT',
  NO_POOL_DATA = 'NO_POOL_DATA',
  NO_VALUE_PARAMETER = 'NO_VALUE_PARAMETER',
  POOL_DOESNT_EXIST = 'POOL_DOESNT_EXIST',
  QUERY_BATCH_SWAP = 'QUERY_BATCH_SWAP',
  RELAY_SWAP_AMOUNTS = 'RELAY_SWAP_AMOUNTS',
  REWARD_TOKEN_ZERO = 'REWARD_TOKEN_ZERO',
  STABLE_GET_BALANCE_DIDNT_CONVERGE = 'STABLE_GET_BALANCE_DIDNT_CONVERGE',
  STABLE_INVARIANT_DIDNT_CONVERGE = 'STABLE_INVARIANT_DIDNT_CONVERGE',
  SWAP_ZERO_RETURN_AMOUNT = 'SWAP_ZERO_RETURN_AMOUNT',
  TIMESTAMP_IN_THE_FUTURE = 'TIMESTAMP_IN_THE_FUTURE',
  TOKEN_MISMATCH = 'TOKEN_MISMATCH',
  UNSUPPORTED_PAIR = 'UNSUPPORTED_PAIR',
  UNSUPPORTED_POOL_TYPE = 'UNSUPPORTED_POOL_TYPE',
  UNSUPPORTED_POOL_TYPE_VERSION = 'UNSUPPORTED_POOL_TYPE_VERSION',
  UNWRAP_ZERO_AMOUNT = 'UNWRAP_ZERO_AMOUNT',
  WRAP_ZERO_AMOUNT = 'WRAP_ZERO_AMOUNT',
}

export class BalancerError extends Error {
  constructor(public code: BalancerErrorCode) {
    super(BalancerError.getMessage(code));
    this.name = 'BalancerError';
  }

  static getMessage(code: BalancerErrorCode): string {
    switch (code) {
      case BalancerErrorCode.SWAP_ZERO_RETURN_AMOUNT:
        return 'queryBatchSwapWithSor returned 0 amount';
      case BalancerErrorCode.UNWRAP_ZERO_AMOUNT:
        return 'swapUnwrapAaveStaticExactIn unwrapped amount < 0';
      case BalancerErrorCode.WRAP_ZERO_AMOUNT:
        return 'swapUnwrapAaveStaticExactOut wrapped amount < 0';
      case BalancerErrorCode.QUERY_BATCH_SWAP:
        return 'queryBatchSwap on chain call error';
      case BalancerErrorCode.POOL_DOESNT_EXIST:
        return 'balancer pool does not exist';
      case BalancerErrorCode.UNSUPPORTED_POOL_TYPE:
        return 'unsupported pool type';
      case BalancerErrorCode.UNSUPPORTED_PAIR:
        return 'unsupported token pair';
      case BalancerErrorCode.NO_POOL_DATA:
        return 'no pool data';
      case BalancerErrorCode.INPUT_OUT_OF_BOUNDS:
        return 'input out of bounds';
      case BalancerErrorCode.INPUT_LENGTH_MISMATCH:
        return 'input length mismatch';
      case BalancerErrorCode.INPUT_TOKEN_INVALID:
        return 'input token invalid';
      case BalancerErrorCode.TOKEN_MISMATCH:
        return 'token mismatch';
      case BalancerErrorCode.MISSING_DECIMALS:
        return 'missing decimals';
      case BalancerErrorCode.MISSING_TOKENS:
        return 'missing tokens';
      case BalancerErrorCode.MISSING_AMP:
        return 'missing amp';
      case BalancerErrorCode.MISSING_PRICE_RATE:
        return 'missing price rate';
      case BalancerErrorCode.MISSING_WEIGHT:
        return 'missing weight';
      case BalancerErrorCode.INPUT_ZERO_NOT_ALLOWED:
        return 'zero input not allowed';
      case BalancerErrorCode.RELAY_SWAP_AMOUNTS:
        return 'Error when checking swap amounts';
      case BalancerErrorCode.NO_VALUE_PARAMETER:
        return 'Illegal value passed as parameter';
      case BalancerErrorCode.TIMESTAMP_IN_THE_FUTURE:
        return 'Timestamp cannot be in the future';
      case BalancerErrorCode.ILLEGAL_PARAMETER:
        return 'An illegal parameter has been passed';
      case BalancerErrorCode.JOIN_DELTA_AMOUNTS:
        return 'Error when checking join call deltas';
      case BalancerErrorCode.EXIT_DELTA_AMOUNTS:
        return 'Error when checking exit call deltas';
      case BalancerErrorCode.GAUGES_NOT_FOUND:
        return 'Liquidity Gauges not found with given addresses';
      case BalancerErrorCode.GAUGES_HELPER_ADDRESS_NOT_PROVIDED:
        return 'Liquidity Gauges Helper Contract address has not been provided';
      case BalancerErrorCode.GAUGES_REWARD_MINTER_ADDRESS_NOT_PROVIDED:
        return 'Liquidity Gauges Reward Minter Contract address has not been provided';
      case BalancerErrorCode.FEE_PROVIDER_NOT_PROVIDED:
        return 'Fee Provider Repository has not been provided';
      case BalancerErrorCode.GAUGES_REWARD_TOKEN_EMPTY:
        return 'No Reward Tokens for Liquidity Gauges provided';
      case BalancerErrorCode.REWARD_TOKEN_ZERO:
        return 'All Zero Values for Reward Tokens';
      default:
        return 'Unknown error';
    }
  }
}
