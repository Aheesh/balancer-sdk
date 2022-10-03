import {
  SubgraphPoolBase,
  SwapInfo,
  SwapTypes,
  SwapV2,
} from '@balancer-labs/sor';
import {
  Relayer,
  OutputReference,
  EncodeJoinPoolInput,
  EncodeBatchSwapInput,
  ExitPoolData,
} from '@/modules/relayer/relayer.module';
import { getPoolAddress } from '@/pool-utils';
import { Interface } from '@ethersproject/abi';

import { ExitPoolRequest } from '@/types';
import { FundManagement, SwapType } from './types';
import balancerRelayerAbi from '@/lib/abi/BalancerRelayer.json';
import { WeightedPoolEncoder } from '@/pool-weighted';
import { BigNumber } from 'ethers';
import { AssetHelpers } from '@/lib/utils';
import { MaxInt256 } from '@ethersproject/constants';

interface Action {
  type: string;
  opRef: OutputReference[];
  swaps: SwapV2[];
  minOut: string;
  assets: string[];
}

// TODO - Safety check at end to make sure nothing is wrong?

// mainnet V4 - TODO - Make this part of config
const relayerAddress = '0x2536dfeeCB7A0397CF98eDaDA8486254533b1aFA';
// const relayerAddress = '0x886A3Ec7bcC508B8795990B60Fa21f85F9dB7948';
// TODO -
const wrappedNativeAsset = '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2';

const balancerRelayerInterface = new Interface(balancerRelayerAbi);

function getOutputRef(key: number, index: number): OutputReference {
  const keyRef = Relayer.toChainedReference(key);
  return { index: index, key: keyRef };
}

export function hasJoinExit(swap: SwapV2, assets: string[]): boolean {
  const tokenIn = assets[swap.assetInIndex];
  const tokenOut = assets[swap.assetOutIndex];
  const poolAddress = getPoolAddress(swap.poolId);
  return [tokenIn, tokenOut].includes(poolAddress);
}

export function isJoin(swap: SwapV2, assets: string[]): boolean {
  // token[join]bpt
  const tokenOut = assets[swap.assetOutIndex];
  const poolAddress = getPoolAddress(swap.poolId);
  return tokenOut.toLowerCase() === poolAddress.toLowerCase();
}

export function isExit(swap: SwapV2, assets: string[]): boolean {
  // bpt[exit]token
  const tokenIn = assets[swap.assetInIndex];
  const poolAddress = getPoolAddress(swap.poolId);
  return tokenIn.toLowerCase() === poolAddress.toLowerCase();
}

export function someJoinExit(swaps: SwapV2[], assets: string[]): boolean {
  return swaps.some((swap) => {
    return hasJoinExit(swap, assets);
  });
}

/*
This aims to minimise the number of Actions the Relayer multicall needs to call by
ordering the Actions in a way that allows swaps to be batched together.
*/
export function orderActions(
  actions: Action[],
  tokenIn: string,
  tokenOut: string,
  assets: string[]
): Action[] {
  const tokenInIndex = assets.indexOf(tokenIn);
  const tokenOutIndex = assets.indexOf(tokenOut);
  const enterActions: Action[] = [];
  const exitActions: Action[] = [];
  const middleActions: Action[] = [];
  for (const a of actions) {
    // joins/exits with tokenIn can always be done first
    if (
      (a.type === 'join' || a.type === 'exit') &&
      a.swaps[0].assetInIndex === tokenInIndex
    )
      enterActions.push(a);
    // joins/exits with tokenOut (and not tokenIn) can always be done last
    else if (
      (a.type === 'join' || a.type === 'exit') &&
      a.swaps[0].assetOutIndex === tokenOutIndex
    )
      exitActions.push(a);
    // All other actions will be chained inbetween
    else middleActions.push(a);
  }
  const allActions: Action[] = [
    ...enterActions,
    ...middleActions,
    ...exitActions,
  ];
  const orderedActions: Action[] = [];
  // batchSwaps are a collection of swaps that can all be called in a single batchSwap
  let batchSwaps: Action = {
    type: 'batchswap',
    swaps: [],
    opRef: [],
    minOut: '0',
    assets,
  };

  for (const a of allActions) {
    // batch neighbouring swaps together
    if (a.type === 'swap') {
      batchSwaps.swaps.push(...a.swaps);
      batchSwaps.opRef.push(...a.opRef);
      batchSwaps.minOut = a.minOut;
    } else {
      if (batchSwaps.swaps.length > 0) {
        orderedActions.push(batchSwaps);
        // new batchSwap collection as there is a chained join/exit inbetween
        batchSwaps = {
          type: 'batchswap',
          swaps: [],
          opRef: [],
          minOut: '0',
          assets,
        };
      }
      orderedActions.push(a);
    }
  }
  if (batchSwaps.swaps.length > 0) orderedActions.push(batchSwaps);
  return orderedActions;
}

/*
Create an array of Actions for each swap.
An Action is a join/exit/swap with the chained output refs.
*/
export function getActions(
  tokenIn: string,
  tokenOut: string,
  swaps: SwapV2[],
  assets: string[],
  amountOut: string
): Action[] {
  const tokenInIndex = assets.findIndex(
    (t) => t.toLowerCase() === tokenIn.toLowerCase()
  );
  const tokenOutIndex = assets.findIndex(
    (t) => t.toLowerCase() === tokenOut.toLowerCase()
  );
  const actions: Action[] = [];
  let opRefKey = 0;
  for (const swap of swaps) {
    let type = 'swap';
    let minOut = '0';
    const opRef: OutputReference[] = [];
    if (isJoin(swap, assets)) {
      type = 'join';
    } else if (isExit(swap, assets)) {
      type = 'exit';
    }
    if (
      swap.assetInIndex === tokenInIndex &&
      swap.assetOutIndex === tokenOutIndex
    ) {
      minOut = amountOut;
    } else if (swap.assetInIndex === tokenInIndex) {
      opRef.push(getOutputRef(opRefKey, swap.assetOutIndex));
      opRefKey++;
    } else if (swap.assetOutIndex === tokenOutIndex) {
      swap.amount = Relayer.toChainedReference(opRefKey - 1).toString();
      minOut = amountOut;
    } else {
      if (type === 'join' || type === 'exit')
        swap.amount = Relayer.toChainedReference(opRefKey - 1).toString();

      opRef.push(getOutputRef(opRefKey, swap.assetOutIndex));
      opRefKey++;
    }
    actions.push({
      type,
      swaps: [swap],
      opRef,
      minOut,
      assets,
    });
  }
  return actions;
}

function buildExit(
  pool: SubgraphPoolBase,
  swapType: SwapTypes,
  action: Action,
  user: string,
  tokenOut: string
): string {
  const assets = pool.tokensList;
  const assetHelpers = new AssetHelpers(wrappedNativeAsset);
  // tokens must have same order as pool getTokens
  const [sortedTokens] = assetHelpers.sortTokens(assets) as [string[]];
  const exitToken = action.assets[action.swaps[0].assetOutIndex];
  const exitTokenIndex = sortedTokens.findIndex(
    (t) => t.toLowerCase() === exitToken.toLowerCase()
  );
  let userData: string;
  const minAmountsOut = Array(assets.length).fill('0');
  if (swapType === SwapTypes.SwapExactIn) {
    // Variable amount of token out
    minAmountsOut[exitTokenIndex] = action.minOut;
    // Uses exact amount in
    userData = WeightedPoolEncoder.exitExactBPTInForOneTokenOut(
      action.swaps[0].amount,
      exitTokenIndex
    );
  } else {
    // Uses exact amount of token out
    minAmountsOut[exitTokenIndex] = action.swaps[0].amount;
    // Variable amount of BPT in
    userData = WeightedPoolEncoder.exitBPTInForExactTokensOut(
      minAmountsOut,
      action.minOut
    );
  }

  // Send to relayer unless this is main token out
  let toInternalBalance = true;
  if (exitToken.toLowerCase() === tokenOut.toLowerCase())
    toInternalBalance = false;

  const exitParams: ExitPoolData = {
    assets: sortedTokens,
    minAmountsOut,
    userData,
    toInternalBalance,
    poolId: action.swaps[0].poolId,
    poolKind: 0, // This will always be 0 to match supported Relayer types
    sender: user,
    recipient: toInternalBalance ? relayerAddress : user,
    outputReferences: action.opRef,
    exitPoolRequest: {} as ExitPoolRequest,
  };
  const callData = Relayer.constructExitCall(exitParams);
  return callData;
}

function buildJoin(
  pool: SubgraphPoolBase,
  swapType: SwapTypes,
  action: Action,
  user: string,
  tokenIn: string,
  tokenOut: string
): string {
  const assets = pool.tokensList;
  const assetHelpers = new AssetHelpers(wrappedNativeAsset);
  // tokens must have same order as pool getTokens
  const [sortedTokens] = assetHelpers.sortTokens(assets) as [string[]];
  const joinToken = action.assets[action.swaps[0].assetInIndex];
  const joinTokenIndex = sortedTokens.findIndex(
    (t) => t.toLowerCase() === joinToken.toLowerCase()
  );

  const maxAmountsIn = Array(assets.length).fill('0');
  let userData: string;

  if (swapType === SwapTypes.SwapExactIn) {
    // Uses exact amounts of tokens in
    maxAmountsIn[joinTokenIndex] = action.swaps[0].amount;
    // Variable amount of BPT out
    userData = WeightedPoolEncoder.joinExactTokensInForBPTOut(
      maxAmountsIn,
      action.minOut
    );
  } else {
    // Uses variable amounts of tokens in
    maxAmountsIn[joinTokenIndex] = action.minOut;
    // Exact amount of BPT out
    userData = WeightedPoolEncoder.joinTokenInForExactBPTOut(
      action.swaps[0].amount,
      joinTokenIndex
    );
  }

  let fromInternalBalance = true;
  if (joinToken.toLowerCase() === tokenIn.toLowerCase())
    fromInternalBalance = false;

  let toInternalBalance = true;
  if (pool.address.toLowerCase() === tokenOut.toLowerCase())
    toInternalBalance = false;

  const attributes: EncodeJoinPoolInput = {
    poolId: action.swaps[0].poolId,
    sender: fromInternalBalance ? relayerAddress : user,
    recipient: toInternalBalance ? relayerAddress : user,
    kind: 0,
    joinPoolRequest: {
      assets: sortedTokens,
      maxAmountsIn,
      userData,
      fromInternalBalance,
    },
    value: '0',
    outputReferences: action.opRef[0] ? action.opRef[0].key.toString() : '0',
  };

  // console.log(attributes);

  const callData = Relayer.constructJoinCall(attributes);
  return callData;
}

function buildBatchSwap(
  action: Action,
  user: string,
  swapType: SwapTypes,
  tokenIn: string,
  tokenOut: string,
  swapAmount: string,
  pools: SubgraphPoolBase[]
): string[] {
  const tokenInIndex = action.swaps[0].assetInIndex;
  const tokenOutIndex = action.swaps[action.swaps.length - 1].assetOutIndex;
  let toInternalBalance = true;
  let fromInternalBalance = true;
  const calls: string[] = [];
  // For tokens going in to the Vault, the limit shall be a positive number. For tokens going out of the Vault, the limit shall be a negative number.
  const limits = Array(action.assets.length).fill('0');
  if (
    tokenOut.toLowerCase() === action.assets[tokenOutIndex].toLowerCase() ||
    pools.some(
      (p) =>
        p.address.toLowerCase() === action.assets[tokenOutIndex].toLowerCase()
    )
  ) {
    // If tokenOut is a BPT this needs to be false as we can't exit a pool from internal balances
    toInternalBalance = false;
    limits[tokenOutIndex] = BigNumber.from(action.minOut).mul(-1).toString();
  }

  let sender: string;
  if (tokenIn.toLowerCase() === action.assets[tokenInIndex].toLowerCase()) {
    fromInternalBalance = false;
    sender = user;
    limits[tokenInIndex] = swapAmount;
  } else if (
    pools.some(
      (p) =>
        p.address.toLowerCase() === action.assets[tokenInIndex].toLowerCase()
    )
  ) {
    // new pools have automatic infinite vault allowance, but not old ones
    const key = Relayer.fromChainedReference(action.swaps[0].amount);
    const readOnlyRef = Relayer.toChainedReference(key, false);
    const approval = Relayer.encodeApproveVault(
      action.assets[tokenInIndex],
      readOnlyRef.toString()
    );
    calls.push(approval);
    // If tokenIn is a BPT this needs to be false as we can't join a pool from internal balances
    fromInternalBalance = false;
    sender = relayerAddress;
    limits[tokenInIndex] = MaxInt256.toString();
  } else {
    sender = relayerAddress;
    limits[tokenInIndex] = MaxInt256.toString();
  }

  const funds: FundManagement = {
    sender,
    recipient: toInternalBalance ? relayerAddress : user,
    fromInternalBalance,
    toInternalBalance,
  };

  const batchSwapInput: EncodeBatchSwapInput = {
    swapType:
      swapType === SwapTypes.SwapExactIn
        ? SwapType.SwapExactIn
        : SwapType.SwapExactOut,
    swaps: action.swaps,
    assets: action.assets,
    funds,
    limits,
    deadline: BigNumber.from(Math.ceil(Date.now() / 1000) + 3600), // 1 hour from now
    value: '0',
    outputReferences: action.opRef,
  };
  // console.log(batchSwapInput);

  const encodedBatchSwap = Relayer.encodeBatchSwap(batchSwapInput);
  calls.push(encodedBatchSwap);
  return calls;
}

/**
 * Uses relayer to approve itself to act in behalf of the user
 *
 * @param authorisation Encoded authorisation call.
 * @returns relayer approval call
 */
function buildSetRelayerApproval(authorisation: string): string {
  return Relayer.encodeSetRelayerApproval(relayerAddress, true, authorisation);
}

export function buildCalls(
  pools: SubgraphPoolBase[],
  tokenIn: string,
  tokenOut: string,
  swapInfo: SwapInfo,
  user: string,
  authorisation: string | undefined,
  swapType: SwapTypes
): {
  to: string;
  data: string;
} {
  const actions = getActions(
    tokenIn,
    tokenOut,
    swapInfo.swaps,
    swapInfo.tokenAddresses,
    swapInfo.returnAmount.toString()
  );
  const orderedActions = orderActions(
    actions,
    tokenIn,
    tokenOut,
    swapInfo.tokenAddresses
  );
  const calls: string[] = [];
  if (authorisation) calls.push(buildSetRelayerApproval(authorisation));

  for (const action of orderedActions) {
    if (action.type === 'exit') {
      const pool = pools.find((p) => p.id === action.swaps[0].poolId);
      if (pool === undefined) throw new Error(`Pool Doesn't Exist`);
      calls.push(buildExit(pool, swapType, action, user, tokenOut));
    }
    if (action.type === 'join') {
      const pool = pools.find((p) => p.id === action.swaps[0].poolId);
      if (pool === undefined) throw new Error(`Pool Doesn't Exist`);
      calls.push(buildJoin(pool, swapType, action, user, tokenIn, tokenOut));
    }
    if (action.type === 'batchswap') {
      calls.push(
        ...buildBatchSwap(
          action,
          user,
          swapType,
          tokenIn,
          tokenOut,
          swapInfo.swapAmount.toString(),
          pools
        )
      );
    }
  }

  const callData = balancerRelayerInterface.encodeFunctionData('multicall', [
    calls,
  ]);

  return {
    to: relayerAddress,
    data: callData,
  };
}
