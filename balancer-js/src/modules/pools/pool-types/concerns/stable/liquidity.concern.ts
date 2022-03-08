import { LiquidityConcern } from '../types';
import { BigNumberish } from '@ethersproject/bignumber';

export class StablePoolLiquidity implements LiquidityConcern {
    calcTotal(
        tokenBalances: BigNumberish[],
        tokenDecimals: number[],
        tokenPriceRates: BigNumberish[],
        tokenPrices: (number | null)[]
    ): string {
        // TODO implementation
        console.log(tokenBalances, tokenDecimals, tokenPriceRates, tokenPrices);
        return '1000';
    }
}
