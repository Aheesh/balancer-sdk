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
import { Provider } from '@ethersproject/providers';
import { VaultModel } from './vaultModel/vaultModel.module';

export type BalancerSDKRoot = {
  config: BalancerSdkConfig;
  sor: Sor;
  subgraph: Subgraph;
  pools: Pools;
  data: Data;
  swaps: Swaps;
  relayer: Relayer;
  networkConfig: BalancerNetworkConfig;
  rpcProvider: Provider;
  claimService?: IClaimService;
};

/**
 * Balancer SDK - services for interacting with Balancer Protocol V2.
 *
 * ```ts
 * import { BalancerSDK, Network } from '@balancer-labs/sdk'
 *
 * const balancer = new BalancerSDK({
 *   network: Network.MAINNET,
 *   rpcUrl: 'https://ethereum-node:8454/...',
 * })
 * ```
 *
 * @public
 */
export class BalancerSDK implements BalancerSDKRoot {
  /**
   * Token swapping functions.
   */
  readonly swaps: Swaps;

  /**
   * @public
   */
  readonly relayer: Relayer;
  /**
   * @public
   */
  readonly pricing: Pricing;
  /**
   * @public
   */
  readonly pools: Pools;
  /**
   * @public
   */
  readonly data: Data;
  readonly balancerContracts: Contracts;
  /**
   * @public
   */
  readonly zaps: Zaps;
  readonly vaultModel: VaultModel;

  /**
   * @public
   */
  readonly networkConfig: BalancerNetworkConfig;
  /**
   * @public
   */
  readonly provider: Provider;
  readonly claimService?: IClaimService;

  /**
   * @public
   * @param config
   * @param sor
   * @param subgraph
   */
  constructor(
    public config: BalancerSdkConfig,
    public sor = new Sor(config),
    public subgraph = new Subgraph(config)
  ) {
    this.networkConfig = getNetworkConfig(config);
    this.provider = sor.provider;

    this.data = new Data(
      this.networkConfig,
      sor.provider,
      config.subgraphQuery
    );
    this.swaps = new Swaps(this.config);
    this.relayer = new Relayer(this.swaps);
    this.pricing = new Pricing(config, this.sor);
    this.pools = new Pools(this.networkConfig, this.data);

    this.balancerContracts = new Contracts(
      this.networkConfig.addresses.contracts,
      sor.provider
    );
    this.zaps = new Zaps(this.networkConfig.chainId);
    if (this.data.liquidityGauges)
      this.claimService = new ClaimService(
        this.data.liquidityGauges,
        this.data.feeDistributor,
        this.networkConfig.chainId,
        this.networkConfig.addresses.contracts.multicall,
        this.provider,
        this.networkConfig.addresses.contracts.gaugeClaimHelper,
        this.networkConfig.addresses.contracts.balancerMinterAddress
      );
    this.vaultModel = new VaultModel(
      this.data.poolsForSor,
      this.networkConfig.addresses.tokens.wrappedNativeAsset
    );
  }

  get rpcProvider(): Provider {
    return this.sor.provider;
  }

  /**
   * Instantiated Balancer typechain contracts, e.g. Vault, LidoRelayer.
   * @public
   */
  get contracts(): ContractInstances {
    return this.balancerContracts.contracts;
  }
}
