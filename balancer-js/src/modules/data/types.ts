export { LiquidityGauge } from './liquidity-gauges/provider';
export { PoolAttribute } from './pool/types';
export { TokenAttribute } from './token/types';
export { ProtocolFees } from './protocol-fees/provider';
export * from './pool-gauges/types';
export * from './pool-shares/types';
export * from './gauge-shares/types';

export interface Findable<T, P = string> {
  find: (
    id: string,
    filter?: Record<string, unknown>
  ) => Promise<T | undefined>;
  findBy: (
    attribute: P,
    value: string,
    filter?: Record<string, unknown>
  ) => Promise<T | undefined>;
}

export interface Searchable<T> {
  all: () => Promise<T[]>;
  where: (filters: (arg: T) => boolean) => Promise<T[]>;
}
