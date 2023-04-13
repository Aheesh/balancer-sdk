import { ClaimService, IClaimService } from '@/modules/claims/ClaimService';
import { BalancerSdkConfig, BalancerNetworkConfig } from '@/types';
import { Swaps } from './swaps/swaps.module';
import { Relayer } from './relayer/relayer.module';
import { Subgraph } from './subgraph/subgraph.module';
import { Sor } from './sor/sor.module';
import { getNetworkConfig } from './sdk.helpers';
import { Pricing } from './pricing/pricing.module';
import { ContractInstances, Contracts } from './contracts/contracts.module';
import { Zaps } from './zaps/zaps.module';
import { Pools } from './pools';
import { Data } from './data';
import { VaultModel } from './vaultModel/vaultModel.module';
import { JsonRpcProvider } from '@ethersproject/providers';
import { Migrations } from './liquidity-managment/migrations';

export interface BalancerSDKRoot {
  config: BalancerSdkConfig;
  sor: Sor;
  subgraph: Subgraph;
  pools: Pools;
  data: Data;
  swaps: Swaps;
  relayer: Relayer;
  networkConfig: BalancerNetworkConfig;
  provider: JsonRpcProvider;
  claimService?: IClaimService;
}

export class BalancerSDK implements BalancerSDKRoot {
  readonly swaps: Swaps;
  readonly relayer: Relayer;
  readonly pricing: Pricing;
  readonly pools: Pools;
  readonly data: Data;
  balancerContracts: Contracts;
  zaps: Zaps;
  vaultModel: VaultModel;
  readonly networkConfig: BalancerNetworkConfig;
  readonly provider: JsonRpcProvider;
  readonly claimService?: IClaimService;
  readonly migrationService?: Migrations;

  constructor(
    public config: BalancerSdkConfig,
    public sor = new Sor(config),
    public subgraph = new Subgraph(config)
  ) {
    this.networkConfig = getNetworkConfig(config);
    this.provider = sor.provider as JsonRpcProvider;

    this.data = new Data(
      this.networkConfig,
      sor.provider,
      config.subgraphQuery
    );
    this.swaps = new Swaps(this.config);
    this.relayer = new Relayer();
    this.pricing = new Pricing(config, this.swaps);

    this.balancerContracts = new Contracts(
      this.networkConfig.addresses.contracts,
      sor.provider
    );

    this.pools = new Pools(
      this.networkConfig,
      this.data,
      this.balancerContracts
    );

    this.zaps = new Zaps(this.networkConfig.chainId);
    if (this.data.liquidityGauges) {
      this.claimService = new ClaimService(
        this.data.liquidityGauges,
        this.data.feeDistributor,
        this.networkConfig.chainId,
        this.networkConfig.addresses.contracts.multicall,
        this.provider,
        this.networkConfig.addresses.contracts.gaugeClaimHelper,
        this.networkConfig.addresses.contracts.balancerMinterAddress
      );
      this.migrationService = new Migrations(
        this.networkConfig.addresses.contracts.relayerV5 as string,
        this.data.pools,
        this.data.liquidityGauges.subgraph,
        this.provider
      );
    }
    this.vaultModel = new VaultModel(
      this.data.poolsForSor,
      this.networkConfig.addresses.tokens.wrappedNativeAsset
    );
  }

  /**
   * Expose balancer contracts, e.g. Vault, LidoRelayer.
   */
  get contracts(): ContractInstances {
    return this.balancerContracts.contracts;
  }
}
