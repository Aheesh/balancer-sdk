// yarn test:only ./src/modules/pools/pool-types/concerns/fx/liquidity.concern.integration.spec.ts
import dotenv from 'dotenv';
import { Network, PoolWithMethods } from '@/types';
import { forkSetup, TestPoolHelper } from '@/test/lib/utils';
import { ethers } from 'hardhat';
import { BalancerSDK } from '@/modules/sdk.module';
import { FXPool__factory } from '@/contracts';
import { Contract } from '@ethersproject/contracts';
import { expect } from 'chai';
import { formatFixed, parseFixed } from '@ethersproject/bignumber';
import { SolidityMaths } from '@/lib/utils/solidityMaths';

dotenv.config();

const network = Network.POLYGON;
const { ALCHEMY_URL_POLYGON: rpcUrlArchive } = process.env;
const rpcUrlLocal = 'http://127.0.0.1:8137';

const provider = new ethers.providers.JsonRpcProvider(rpcUrlLocal, network);
const signer = provider.getSigner();
const testPoolId =
  '0x726e324c29a1e49309672b244bdc4ff62a270407000200000000000000000702';
let pool: PoolWithMethods;
const blockNumber = 41400000;

describe('FX Pool - Calculate Liquidity', () => {
  const sdkConfig = {
    network,
    rpcUrl: rpcUrlLocal,
  };
  const balancer = new BalancerSDK(sdkConfig);
  before(async () => {
    const testPool = new TestPoolHelper(
      testPoolId,
      network,
      rpcUrlLocal,
      blockNumber
    );
    // Gets initial pool info from Subgraph
    pool = await testPool.getPool();

    // Setup forked network, set initial token balances and allowances
    await forkSetup(signer, [], [], [], rpcUrlArchive as string, undefined);

    // Update pool info with onchain state from fork block no
    pool = await testPool.getPool();
  });
  it('calculating liquidity', async () => {
    const liquidity = await balancer.pools.liquidity(pool);
    const poolInterface = FXPool__factory.createInterface();
    const poolContract = new Contract(pool.address, poolInterface, provider);
    const liquidityFromContract = (
      await poolContract.liquidity()
    ).total_.toBigInt();
    const liquidityBigInt = parseFixed(liquidity, 18).toBigInt();
    // expecting 5% of margin error
    console.log(
      formatFixed(
        SolidityMaths.divDownFixed(liquidityBigInt, liquidityFromContract),
        18
      ).toString()
    );
    expect(
      parseFloat(
        formatFixed(
          SolidityMaths.divDownFixed(liquidityBigInt, liquidityFromContract),
          18
        ).toString()
      )
    ).to.be.closeTo(1, 0.05);
  });
});
