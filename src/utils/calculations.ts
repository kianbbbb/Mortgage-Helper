import type {
  MortgageProduct,
  MortgageInputs,
  MortgageResult,
  RepaymentType,
} from '../types/mortgage';

/**
 * Calculates the monthly repayment mortgage payment.
 * Uses the standard annuity formula:
 *   M = P * [r(1+r)^n] / [(1+r)^n - 1]
 */
export function calcRepaymentMonthly(
  principal: number,
  annualRatePercent: number,
  termYears: number,
): number {
  const r = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
}

/**
 * Calculates the monthly interest-only payment.
 *   M = P * r / 12
 */
export function calcInterestOnlyMonthly(
  principal: number,
  annualRatePercent: number,
): number {
  return (principal * annualRatePercent) / 100 / 12;
}

/**
 * Returns the monthly payment given the repayment type.
 */
export function calcMonthly(
  principal: number,
  annualRatePercent: number,
  termYears: number,
  repaymentType: RepaymentType,
): number {
  if (repaymentType === 'interest-only') {
    return calcInterestOnlyMonthly(principal, annualRatePercent);
  }
  return calcRepaymentMonthly(principal, annualRatePercent, termYears);
}

/**
 * Computes the outstanding balance after a number of payments have been made
 * on a repayment mortgage.
 */
export function calcOutstandingBalance(
  principal: number,
  annualRatePercent: number,
  termYears: number,
  paymentsMade: number,
): number {
  const r = annualRatePercent / 100 / 12;
  const n = termYears * 12;
  if (r === 0) {
    return principal - (principal / n) * paymentsMade;
  }
  const monthly = calcRepaymentMonthly(principal, annualRatePercent, termYears);
  return (
    principal * Math.pow(1 + r, paymentsMade) -
    monthly * ((Math.pow(1 + r, paymentsMade) - 1) / r)
  );
}

/**
 * Determines whether a product is eligible given user inputs and why not if so.
 */
function checkEligibility(
  product: MortgageProduct,
  inputs: MortgageInputs,
  loanAmount: number,
  ltv: number,
): { eligible: boolean; reason?: string } {
  if (ltv > product.maxLTV) {
    return {
      eligible: false,
      reason: `LTV ${ltv.toFixed(1)}% exceeds maximum ${product.maxLTV}% for this product`,
    };
  }
  if (loanAmount < product.minLoan) {
    return {
      eligible: false,
      reason: `Loan £${loanAmount.toLocaleString()} is below minimum £${product.minLoan.toLocaleString()}`,
    };
  }
  if (loanAmount > product.maxLoan) {
    return {
      eligible: false,
      reason: `Loan £${loanAmount.toLocaleString()} exceeds maximum £${product.maxLoan.toLocaleString()}`,
    };
  }
  if (inputs.repaymentType === 'interest-only' && !product.supportsInterestOnly) {
    return {
      eligible: false,
      reason: 'This product does not support interest-only repayment',
    };
  }
  return { eligible: true };
}

/**
 * Calculates a full MortgageResult for a given product and user inputs.
 * For products where initialPeriodYears >= termYears, the entire mortgage
 * stays at the initial rate.
 */
export function calcMortgageResult(
  product: MortgageProduct,
  inputs: MortgageInputs,
): MortgageResult {
  const loanAmount = inputs.propertyPrice - inputs.depositAmount;
  const ltv = (loanAmount / inputs.propertyPrice) * 100;
  const repaymentType = inputs.repaymentType;
  const termYears = inputs.termYears;

  const eligibility = checkEligibility(product, inputs, loanAmount, ltv);

  // Always compute financials so ineligible products can still be shown
  const initialPeriodYears = Math.min(product.initialPeriodYears, termYears);
  const remainingYears = termYears - initialPeriodYears;

  const initialMonthlyPayment = calcMonthly(
    loanAmount,
    product.initialRate,
    termYears,
    repaymentType,
  );

  // Balance after the initial fixed period (for repayment mortgages)
  const balanceAfterInitial =
    repaymentType === 'repayment'
      ? calcOutstandingBalance(
          loanAmount,
          product.initialRate,
          termYears,
          initialPeriodYears * 12,
        )
      : loanAmount; // interest-only: principal unchanged

  const revertMonthlyPayment =
    remainingYears > 0
      ? calcMonthly(
          balanceAfterInitial,
          product.revertRate,
          remainingYears,
          repaymentType,
        )
      : 0;

  // Total payments during initial period
  const initialPeriodPayments = initialMonthlyPayment * initialPeriodYears * 12;

  // Total payments during revert period
  const revertPeriodPayments =
    repaymentType === 'repayment'
      ? revertMonthlyPayment * remainingYears * 12
      : revertMonthlyPayment * remainingYears * 12 + balanceAfterInitial; // IO: repay capital at end

  const totalPayments = initialPeriodPayments + revertPeriodPayments;
  const totalInterest = totalPayments - loanAmount;
  const totalCost = totalPayments + product.arrangementFee;

  const initialPeriodCost = initialPeriodPayments + product.arrangementFee;

  return {
    product,
    loanAmount,
    ltv,
    initialMonthlyPayment,
    revertMonthlyPayment,
    totalInterest,
    totalCost,
    initialPeriodCost,
    eligible: eligibility.eligible,
    ineligibilityReason: eligibility.reason,
  };
}

/**
 * Generates a monthly amortisation schedule for a repayment mortgage.
 */
export interface AmortisationRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  balance: number;
  rate: number;
}

export function buildAmortisationSchedule(
  product: MortgageProduct,
  inputs: MortgageInputs,
): AmortisationRow[] {
  const loanAmount = inputs.propertyPrice - inputs.depositAmount;
  const termMonths = inputs.termYears * 12;
  const initialMonths = Math.min(product.initialPeriodYears, inputs.termYears) * 12;

  const rows: AmortisationRow[] = [];
  let balance = loanAmount;

  for (let m = 1; m <= termMonths; m++) {
    const rate = m <= initialMonths ? product.initialRate : product.revertRate;
    const remainingMonths = termMonths - m + 1;

    let payment: number;
    let interestPart: number;
    let principalPart: number;

    if (inputs.repaymentType === 'interest-only') {
      interestPart = (balance * rate) / 100 / 12;
      principalPart = m === termMonths ? balance : 0;
      payment = interestPart + principalPart;
    } else {
      const monthlyRate = rate / 100 / 12;
      if (monthlyRate === 0) {
        payment = balance / remainingMonths;
      } else {
        payment =
          (balance * (monthlyRate * Math.pow(1 + monthlyRate, remainingMonths))) /
          (Math.pow(1 + monthlyRate, remainingMonths) - 1);
      }
      interestPart = (balance * rate) / 100 / 12;
      principalPart = payment - interestPart;
    }

    balance = Math.max(0, balance - principalPart);

    rows.push({
      month: m,
      payment,
      interest: interestPart,
      principal: principalPart,
      balance,
      rate,
    });
  }

  return rows;
}

/** Formats a number as GBP currency */
export function formatGBP(value: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Formats a number as a percentage with up to 2 decimal places */
export function formatPct(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}
