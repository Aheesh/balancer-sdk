/**
 * Weighted - Create and do an initial join.
 *
 * Run command:
 * yarn example ./examples/pools/create/create-weighted-pool.ts
 */
import { BalancerSDK, Network, PoolType } from '@balancer-labs/sdk';
import { reset, setTokenBalance, approveToken } from 'examples/helpers';
import { AddressZero } from '@ethersproject/constants';
import { parseFixed } from '@ethersproject/bignumber';
import * as dotenv from 'dotenv';
dotenv.config();
import { ethers } from 'ethers';
import { JsonRpcSigner } from '@ethersproject/providers';
import { argv } from 'process';

async function createAndInitJoinWeightedPool() {
  const args = process.argv.slice(2);
  const balancer = new BalancerSDK({
    network: Network.SEPOLIA,
    rpcUrl:
      args[0] === 'sepolia'
        ? process.env.ALCHEMY_URL || 'DEFAULT_URL'
        : 'http://127.0.0.1:8000',
    //   : 'http://127.0.0.1:8000', // Using local fork for simulation
  });

  // Setup join parameters
  const signerKey = process.env.TRADER_KEY;
  if (!signerKey) {
    throw new Error('No signer specified - check .env file for TRADER_KEY');
  }

  const wallet = new ethers.Wallet(signerKey, balancer.provider);
  const ownerAddress = await wallet.getAddress();
  console.log('Owner Address: ' + ownerAddress);

  const signer = wallet.connect(balancer.provider) as unknown as JsonRpcSigner;

  const tokenA = process.env.TOKEN_A;
  const tokenB = process.env.TOKEN_B;

  if (!tokenA || !tokenB) {
    throw new Error(
      'No token addresses specified - check .env file for TOKEN_A and TOKEN_B'
    );
  }

  const poolTokens = [tokenA, tokenB];
  //Floating point set for typical 18 decimal ERC20 tokens
  const amountsIn = [
    parseFixed('1000000000000000000', 18).toString(),
    parseFixed('1000000000000000000', 18).toString(),
  ];

  // Prepare local fork for simulation
  // await reset(balancer.provider, 6001800);
  // await setTokenBalance(
  //   balancer.provider,
  //   ownerAddress,
  //   poolTokens[0],
  //   amountsIn[0],
  //   2
  // );
  // await setTokenBalance(
  //   balancer.provider,
  //   ownerAddress,
  //   poolTokens[1],
  //   amountsIn[1],
  //   2
  // );

  await approveToken(
    poolTokens[0],
    balancer.contracts.vault.address,
    amountsIn[0],
    signer
  );
  await approveToken(
    poolTokens[1],
    balancer.contracts.vault.address,
    amountsIn[1],
    signer
  );

  const weightedPoolFactory = balancer.pools.poolFactory.of(PoolType.Weighted);

  //Update pool name, symbol, and weights
  const poolParameters = {
    name: 'My-Test-Pool-Name',
    symbol: 'My-Test-Pool-Symbol',
    tokenAddresses: [tokenA, tokenB],
    normalizedWeights: [
      parseFixed('0.5', 18).toString(),
      parseFixed('0.5', 18).toString(),
    ],
    rateProviders: [AddressZero, AddressZero],
    swapFeeEvm: parseFixed('1', 16).toString(),
    owner: ownerAddress,
  };

  // Build the create transaction
  const { to, data } = weightedPoolFactory.create(poolParameters);
  console.log('Create Pool Transaction Data: ' + data);
  console.log('Create Pool Transaction To: ' + to);

  // Send the create transaction
  const receipt = (await (
    await signer.sendTransaction({
      from: ownerAddress,
      to,
      data,
    })
  ).wait()) as ethers.providers.TransactionReceipt;

  // Parsing Log pool creation receipt
  console.log('Pool created with receipt: ' + receipt.transactionHash);

  // Check logs of creation receipt to get new pool ID and address
  const { poolAddress, poolId } =
    await weightedPoolFactory.getPoolAddressAndIdWithReceipt(
      balancer.provider,
      receipt
    );
  console.log('Pool Id: ' + poolId);
  console.log('Pool Address: ' + poolAddress);

  // Build initial join of pool
  const initJoinParams = weightedPoolFactory.buildInitJoin({
    joiner: ownerAddress,
    poolId,
    poolAddress,
    tokensIn: [tokenA, tokenB],
    amountsIn: [
      parseFixed('1000000000000000000', 18).toString(),
      parseFixed('1000000000000000000', 18).toString(),
    ],
  });

  // Sending initial join transaction
  await signer.sendTransaction({
    to: initJoinParams.to,
    data: initJoinParams.data,
    gasLimit: 500000,
  });

  // Check that pool balances are as expected after join
  const tokens = await balancer.contracts.vault.getPoolTokens(poolId);
  console.log('Pool Tokens Addresses: ' + tokens.tokens);
  console.log('Pool Tokens balances: ' + tokens.balances);
}

createAndInitJoinWeightedPool();
