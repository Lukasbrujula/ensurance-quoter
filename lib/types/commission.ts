export interface CarrierCommission {
  carrierId: string
  carrierName: string
  firstYearPercent: number // 0-150
  renewalPercent: number // 0-25
}

export interface CommissionSettings {
  commissions: CarrierCommission[]
  defaultFirstYearPercent: number
  defaultRenewalPercent: number
}

export interface CommissionEstimate {
  firstYear: number // Dollar amount
  renewal: number // Dollar amount per year
  fiveYearTotal: number // firstYear + (renewal * 4)
}
