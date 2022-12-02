export * as balEmissions from './bal/emissions';
export * from './gauge-controller/multicall';
export * from './gauge-shares';
export * from './liquidity-gauges';
export * from './pool';
export * from './pool-gauges';
export * from './pool-shares';
export * from './token';
export * from './token-prices';
export * from './fee-distributor/repository';
export * from './fee-collector/repository';
export * from './protocol-fees/provider';
export * from './token-yields/repository';
export * from './block-number';

import { BalancerNetworkConfig, BalancerDataRepositories } from '@/types';
import { PoolsSubgraphRepository } from './pool/subgraph';
import { PoolsSubgraphOnChainRepository } from './pool/subgraphOnChain';
import { PoolSharesRepository } from './pool-shares/repository';
import { PoolGaugesRepository } from './pool-gauges/repository';
import { GaugeSharesRepository } from './gauge-shares/repository';
import { BlockNumberRepository } from './block-number';
import {
  CoingeckoPriceRepository,
  AaveRates,
  TokenPriceProvider,
} from './token-prices';
import { StaticTokenProvider } from './token/static';
import { LiquidityGaugeSubgraphRPCProvider } from './liquidity-gauges/provider';
import { FeeDistributorRepository } from './fee-distributor/repository';
import { FeeCollectorRepository } from './fee-collector/repository';
import { TokenYieldsRepository } from './token-yields/repository';
import { ProtocolFeesProvider } from './protocol-fees/provider';
import { Provider } from '@ethersproject/providers';

// initialCoingeckoList are used to get the initial token list for coingecko
// TODO: we might want to replace that with what frontend is using
import initialCoingeckoList from '@/modules/data/token-prices/initial-list.json';

export class Data implements BalancerDataRepositories {
  pools;
  poolsOnChain;
  yesterdaysPools;
  poolShares;
  poolGauges;
  gaugeShares;
  tokenPrices;
  tokenMeta;
  liquidityGauges;
  feeDistributor;
  feeCollector;
  protocolFees;
  tokenYields;
  blockNumbers;

  constructor(networkConfig: BalancerNetworkConfig, provider: Provider) {
    this.pools = new PoolsSubgraphRepository({
      url: networkConfig.urls.subgraph,
      chainId: networkConfig.chainId,
    });

    this.poolsOnChain = new PoolsSubgraphOnChainRepository({
      url: networkConfig.urls.subgraph,
      chainId: networkConfig.chainId,
      provider: provider,
    });

    this.poolShares = new PoolSharesRepository(
      networkConfig.urls.subgraph,
      networkConfig.chainId
    );

    if (networkConfig.urls.gaugesSubgraph) {
      this.poolGauges = new PoolGaugesRepository(
        networkConfig.urls.gaugesSubgraph,
        networkConfig.chainId
      );

      this.gaugeShares = new GaugeSharesRepository(
        networkConfig.urls.gaugesSubgraph,
        networkConfig.chainId
      );
    }

    // 🚨 yesterdaysPools is used to calculate swapFees accumulated over last 24 hours
    // TODO: find a better data source for that, eg: maybe DUNE once API is available
    if (networkConfig.urls.blockNumberSubgraph) {
      this.blockNumbers = new BlockNumberRepository(
        networkConfig.urls.blockNumberSubgraph
      );

      const blockDayAgo = async () => {
        if (this.blockNumbers) {
          return await this.blockNumbers.find('dayAgo');
        }
      };

      this.yesterdaysPools = new PoolsSubgraphRepository({
        url: networkConfig.urls.subgraph,
        chainId: networkConfig.chainId,
        blockHeight: blockDayAgo,
      });
    }

    const tokenAddresses = initialCoingeckoList
      .filter((t) => t.chainId == networkConfig.chainId)
      .map((t) => t.address);

    const coingeckoRepository = new CoingeckoPriceRepository(
      tokenAddresses,
      networkConfig.chainId
    );

    const aaveRates = new AaveRates(
      networkConfig.addresses.contracts.multicall,
      provider,
      networkConfig.chainId
    );

    this.tokenPrices = new TokenPriceProvider(coingeckoRepository, aaveRates);

    this.tokenMeta = new StaticTokenProvider([]);

    if (networkConfig.urls.gaugesSubgraph) {
      this.liquidityGauges = new LiquidityGaugeSubgraphRPCProvider(
        networkConfig.urls.gaugesSubgraph,
        networkConfig.addresses.contracts.multicall,
        networkConfig.addresses.contracts.gaugeController || '',
        networkConfig.chainId,
        provider
      );
    }

    if (
      networkConfig.addresses.contracts.feeDistributor &&
      networkConfig.addresses.tokens.bal &&
      networkConfig.addresses.tokens.veBal &&
      networkConfig.addresses.tokens.bbaUsd
    ) {
      this.feeDistributor = new FeeDistributorRepository(
        networkConfig.addresses.contracts.multicall,
        networkConfig.addresses.contracts.feeDistributor,
        networkConfig.addresses.tokens.bal,
        networkConfig.addresses.tokens.veBal,
        networkConfig.addresses.tokens.bbaUsd,
        provider
      );
    }

    this.feeCollector = new FeeCollectorRepository(
      networkConfig.addresses.contracts.vault,
      provider
    );

    if (networkConfig.addresses.contracts.protocolFeePercentagesProvider) {
      this.protocolFees = new ProtocolFeesProvider(
        networkConfig.addresses.contracts.multicall,
        networkConfig.addresses.contracts.protocolFeePercentagesProvider,
        provider
      );
    }

    this.tokenYields = new TokenYieldsRepository(networkConfig.chainId);
  }
}
