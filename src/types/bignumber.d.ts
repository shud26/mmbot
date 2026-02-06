declare module 'bignumber.js' {
  export default class BigNumber {
    constructor(value: string | number | BigNumber)
    static config(config: { DECIMAL_PLACES?: number; ROUNDING_MODE?: number }): void
    static ROUND_DOWN: number
    times(n: BigNumber | string | number): BigNumber
    div(n: BigNumber | string | number): BigNumber
    pow(n: number): BigNumber
    toFixed(dp?: number): string
    toNumber(): number
  }
}
