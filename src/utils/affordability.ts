import type { AffordabilityInputs, BorrowingCapacity } from '../types/mortgage';
import { calcRepaymentMonthly } from './calculations';

/**
 * Standard UK income multiple used by most lenders.
 * Typical range is 4.0–4.5×; we use 4.5× as a generous upper bound.
 */
const INCOME_MULTIPLE = 4.5;

/**
 * The stress rate is added on top of the product rate to simulate
 * affordability under higher rates (regulatory requirement in the UK).
 */
const STRESS_RATE_ADD = 3.0;

/**
 * Calculates borrowing capacity based on income and monthly commitments.
 *
 * UK lenders typically use:
 *  - An income multiple (4–4.5× combined gross income)
 *  - A stress test: ensure the borrower can still afford payments
 *    if rates rise by ~3 percentage points
 */
export function calcBorrowingCapacity(
  affordability: AffordabilityInputs,
  productRate: number,
  termYears: number,
): BorrowingCapacity {
  const totalIncome = affordability.annualIncome + affordability.secondIncome;

  // Income-multiple cap
  const maxBorrowing = totalIncome * INCOME_MULTIPLE;

  // Stress test: can the borrower afford payments at rate + 3%?
  const stressRate = productRate + STRESS_RATE_ADD;
  const stressTestedMonthly = calcRepaymentMonthly(maxBorrowing, stressRate, termYears);

  // Disposable monthly income (gross / 12 minus commitments)
  const monthlyDisposable = totalIncome / 12 - affordability.monthlyCommitments;
  const affordableAtStressRate = stressTestedMonthly <= monthlyDisposable;

  return {
    maxBorrowing,
    incomeMultiple: INCOME_MULTIPLE,
    stressTestedMonthly,
    affordableAtStressRate,
  };
}

/**
 * Given an affordability profile, returns the maximum loan amount
 * that passes both the income multiple test and the stress test.
 */
export function calcMaxAffordableLoan(
  affordability: AffordabilityInputs,
  productRate: number,
  termYears: number,
): number {
  const totalIncome = affordability.annualIncome + affordability.secondIncome;
  const incomeMultipleCap = totalIncome * INCOME_MULTIPLE;

  // Work backwards from disposable income to find max loan under stress test
  const monthlyDisposable = totalIncome / 12 - affordability.monthlyCommitments;
  if (monthlyDisposable <= 0) return 0;

  const stressRate = productRate + STRESS_RATE_ADD;
  const r = stressRate / 100 / 12;
  const n = termYears * 12;

  let stressTestCap: number;
  if (r === 0) {
    stressTestCap = monthlyDisposable * n;
  } else {
    // Invert the annuity formula: P = M * [(1+r)^n - 1] / [r(1+r)^n]
    stressTestCap =
      (monthlyDisposable * (Math.pow(1 + r, n) - 1)) / (r * Math.pow(1 + r, n));
  }

  return Math.max(0, Math.min(incomeMultipleCap, stressTestCap));
}
