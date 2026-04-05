export type MortgageType =
  | 'fixed'
  | 'tracker'
  | 'variable'
  | 'discount'
  | 'interest-only';

export type RepaymentType = 'repayment' | 'interest-only';

export interface MortgageProduct {
  id: string;
  lender: string;
  name: string;
  type: MortgageType;
  /** Annual interest rate as a percentage (e.g. 4.5 means 4.5%) */
  initialRate: number;
  /** Standard variable rate the product reverts to after the initial period */
  revertRate: number;
  /** Duration of the initial rate period in years */
  initialPeriodYears: number;
  /** Maximum Loan-to-Value allowed for this product (%) */
  maxLTV: number;
  /** Arrangement/product fee in GBP */
  arrangementFee: number;
  /** Whether early repayment charges apply during the initial period */
  earlyRepaymentCharge: boolean;
  /** Minimum loan amount in GBP */
  minLoan: number;
  /** Maximum loan amount in GBP */
  maxLoan: number;
  /** Whether the product supports interest-only repayment */
  supportsInterestOnly: boolean;
  /** Overall Cost for Comparison (APRC) as a percentage */
  aprc: number;
}

export interface MortgageInputs {
  propertyPrice: number;
  depositAmount: number;
  termYears: number;
  repaymentType: RepaymentType;
}

export interface MortgageResult {
  product: MortgageProduct;
  loanAmount: number;
  ltv: number;
  /** Monthly payment during the initial rate period */
  initialMonthlyPayment: number;
  /** Monthly payment after reverting to SVR */
  revertMonthlyPayment: number;
  /** Total interest paid over the full mortgage term */
  totalInterest: number;
  /** Total cost over the full term including arrangement fee */
  totalCost: number;
  /** True cost during just the initial period (payments + fee) */
  initialPeriodCost: number;
  /** Whether this product is eligible given the user's inputs */
  eligible: boolean;
  /** Reason for ineligibility, if applicable */
  ineligibilityReason?: string;
}

export type SortField =
  | 'initialMonthlyPayment'
  | 'totalCost'
  | 'totalInterest'
  | 'initialRate'
  | 'aprc';

export type SortDirection = 'asc' | 'desc';
