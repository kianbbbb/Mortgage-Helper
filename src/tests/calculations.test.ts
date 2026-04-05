import { describe, it, expect } from 'vitest';
import {
  calcRepaymentMonthly,
  calcInterestOnlyMonthly,
  calcMonthly,
  calcOutstandingBalance,
  calcMortgageResult,
  buildAmortisationSchedule,
  formatGBP,
  formatPct,
} from '../utils/calculations';
import type { MortgageProduct, MortgageInputs } from '../types/mortgage';

// ─── Sample fixtures ──────────────────────────────────────────────────────────

const SAMPLE_PRODUCT: MortgageProduct = {
  id: 'test-product',
  lender: 'Test Bank',
  name: 'Test 5yr Fixed (85% LTV)',
  type: 'fixed',
  initialRate: 4.57,
  revertRate: 7.24,
  initialPeriodYears: 5,
  maxLTV: 85,
  arrangementFee: 999,
  earlyRepaymentCharge: true,
  minLoan: 25000,
  maxLoan: 1000000,
  supportsInterestOnly: false,
  aprc: 6.7,
};

const SAMPLE_INPUTS: MortgageInputs = {
  propertyPrice: 350000,
  depositAmount: 52500, // 15% deposit → 85% LTV → £297,500 loan
  termYears: 25,
  repaymentType: 'repayment',
};

// ─── calcRepaymentMonthly ─────────────────────────────────────────────────────

describe('calcRepaymentMonthly', () => {
  it('calculates the correct monthly payment for a standard mortgage', () => {
    // £297,500 at 4.57% over 25 years
    const result = calcRepaymentMonthly(297500, 4.57, 25);
    expect(result).toBeCloseTo(1665.44, 0);
  });

  it('returns principal / n when rate is 0%', () => {
    const result = calcRepaymentMonthly(120000, 0, 10);
    expect(result).toBeCloseTo(120000 / (10 * 12), 5);
  });

  it('yields higher payments with a higher rate', () => {
    const low = calcRepaymentMonthly(200000, 3.0, 25);
    const high = calcRepaymentMonthly(200000, 6.0, 25);
    expect(high).toBeGreaterThan(low);
  });

  it('yields higher payments with a shorter term', () => {
    const long = calcRepaymentMonthly(200000, 4.5, 30);
    const short = calcRepaymentMonthly(200000, 4.5, 15);
    expect(short).toBeGreaterThan(long);
  });
});

// ─── calcInterestOnlyMonthly ──────────────────────────────────────────────────

describe('calcInterestOnlyMonthly', () => {
  it('calculates interest-only payment correctly', () => {
    // £200,000 at 5% = £10,000 / year = £833.33 / month
    const result = calcInterestOnlyMonthly(200000, 5.0);
    expect(result).toBeCloseTo(833.33, 1);
  });

  it('is independent of the term (only depends on principal and rate)', () => {
    const m25 = calcInterestOnlyMonthly(200000, 4.5);
    const m30 = calcInterestOnlyMonthly(200000, 4.5);
    expect(m25).toBe(m30);
  });

  it('returns 0 when rate is 0', () => {
    expect(calcInterestOnlyMonthly(300000, 0)).toBe(0);
  });
});

// ─── calcMonthly ──────────────────────────────────────────────────────────────

describe('calcMonthly', () => {
  it('delegates to calcRepaymentMonthly for repayment type', () => {
    const expected = calcRepaymentMonthly(200000, 4.5, 25);
    const result = calcMonthly(200000, 4.5, 25, 'repayment');
    expect(result).toBe(expected);
  });

  it('delegates to calcInterestOnlyMonthly for interest-only type', () => {
    const expected = calcInterestOnlyMonthly(200000, 4.5);
    const result = calcMonthly(200000, 4.5, 25, 'interest-only');
    expect(result).toBe(expected);
  });
});

// ─── calcOutstandingBalance ───────────────────────────────────────────────────

describe('calcOutstandingBalance', () => {
  it('returns the full principal when no payments have been made', () => {
    const balance = calcOutstandingBalance(297500, 4.57, 25, 0);
    expect(balance).toBeCloseTo(297500, 0);
  });

  it('returns ~0 after all payments have been made (full term)', () => {
    const balance = calcOutstandingBalance(297500, 4.57, 25, 25 * 12);
    expect(balance).toBeCloseTo(0, 0);
  });

  it('reduces over time', () => {
    const after5yr = calcOutstandingBalance(297500, 4.57, 25, 5 * 12);
    const after10yr = calcOutstandingBalance(297500, 4.57, 25, 10 * 12);
    expect(after5yr).toBeGreaterThan(after10yr);
  });
});

// ─── calcMortgageResult ───────────────────────────────────────────────────────

describe('calcMortgageResult', () => {
  const result = calcMortgageResult(SAMPLE_PRODUCT, SAMPLE_INPUTS);

  it('computes the loan amount correctly', () => {
    expect(result.loanAmount).toBe(297500);
  });

  it('computes LTV correctly', () => {
    expect(result.ltv).toBeCloseTo(85, 1);
  });

  it('marks the product eligible when LTV is within limit', () => {
    expect(result.eligible).toBe(true);
  });

  it('computes the initial monthly payment', () => {
    expect(result.initialMonthlyPayment).toBeCloseTo(1665.44, 0);
  });

  it('computes a revert monthly payment after the initial period', () => {
    expect(result.revertMonthlyPayment).toBeGreaterThan(result.initialMonthlyPayment);
  });

  it('total cost includes arrangement fee', () => {
    const totalWithoutFee = result.totalCost - result.product.arrangementFee;
    expect(totalWithoutFee).toBeCloseTo(result.totalInterest + result.loanAmount, 0);
  });

  it('marks a product ineligible when LTV exceeds maxLTV', () => {
    const highLTVInputs: MortgageInputs = {
      ...SAMPLE_INPUTS,
      depositAmount: 17500, // 5% deposit → 95% LTV, exceeds 85% max
    };
    const r = calcMortgageResult(SAMPLE_PRODUCT, highLTVInputs);
    expect(r.eligible).toBe(false);
    expect(r.ineligibilityReason).toMatch(/LTV/i);
  });

  it('marks a product ineligible when loan is below minimum', () => {
    const tinyLoanInputs: MortgageInputs = {
      propertyPrice: 50000,
      depositAmount: 35000, // loan = £15,000, below minLoan £25,000
      termYears: 25,
      repaymentType: 'repayment',
    };
    const r = calcMortgageResult(SAMPLE_PRODUCT, tinyLoanInputs);
    expect(r.eligible).toBe(false);
    expect(r.ineligibilityReason).toMatch(/minimum/i);
  });

  it('marks a product ineligible when interest-only is not supported', () => {
    const ioInputs: MortgageInputs = { ...SAMPLE_INPUTS, repaymentType: 'interest-only' };
    const r = calcMortgageResult(SAMPLE_PRODUCT, ioInputs); // product.supportsInterestOnly = false
    expect(r.eligible).toBe(false);
    expect(r.ineligibilityReason).toMatch(/interest-only/i);
  });

  it('handles a product with initialPeriodYears >= termYears (whole term at initial rate)', () => {
    const longProduct: MortgageProduct = {
      ...SAMPLE_PRODUCT,
      initialPeriodYears: 999, // lifetime tracker
      revertRate: 5.0,
    };
    const r = calcMortgageResult(longProduct, SAMPLE_INPUTS);
    expect(r.revertMonthlyPayment).toBe(0);
  });
});

// ─── buildAmortisationSchedule ────────────────────────────────────────────────

describe('buildAmortisationSchedule', () => {
  const schedule = buildAmortisationSchedule(SAMPLE_PRODUCT, SAMPLE_INPUTS);
  const termMonths = SAMPLE_INPUTS.termYears * 12;

  it('produces one row per month over the full term', () => {
    expect(schedule).toHaveLength(termMonths);
  });

  it('the balance at the final month is ~0', () => {
    const lastRow = schedule[schedule.length - 1];
    expect(lastRow.balance).toBeCloseTo(0, 0);
  });

  it('uses the initial rate for the first 5 years', () => {
    for (let m = 1; m <= 60; m++) {
      expect(schedule[m - 1].rate).toBe(SAMPLE_PRODUCT.initialRate);
    }
  });

  it('switches to the revert rate after the initial period', () => {
    for (let m = 61; m <= termMonths; m++) {
      expect(schedule[m - 1].rate).toBe(SAMPLE_PRODUCT.revertRate);
    }
  });

  it('each row has non-negative values', () => {
    schedule.forEach((row) => {
      expect(row.payment).toBeGreaterThanOrEqual(0);
      expect(row.interest).toBeGreaterThanOrEqual(0);
      expect(row.principal).toBeGreaterThanOrEqual(0);
      expect(row.balance).toBeGreaterThanOrEqual(0);
    });
  });

  it('generates a correct schedule for interest-only repayment', () => {
    const ioProduct: MortgageProduct = {
      ...SAMPLE_PRODUCT,
      supportsInterestOnly: true,
    };
    const ioInputs: MortgageInputs = { ...SAMPLE_INPUTS, repaymentType: 'interest-only' };
    const ioSchedule = buildAmortisationSchedule(ioProduct, ioInputs);
    // Every non-final month: principal portion = 0, balance unchanged
    for (let i = 0; i < ioSchedule.length - 1; i++) {
      expect(ioSchedule[i].principal).toBeCloseTo(0, 5);
    }
    // Final month: principal = full loan amount, balance = 0
    const last = ioSchedule[ioSchedule.length - 1];
    expect(last.principal).toBeCloseTo(297500, 0);
    expect(last.balance).toBeCloseTo(0, 0);
  });
});

// ─── formatGBP ───────────────────────────────────────────────────────────────

describe('formatGBP', () => {
  it('formats a whole-number amount as GBP', () => {
    expect(formatGBP(1000)).toBe('£1,000.00');
  });

  it('formats a fractional amount as GBP', () => {
    expect(formatGBP(1665.44)).toBe('£1,665.44');
  });

  it('formats zero correctly', () => {
    expect(formatGBP(0)).toBe('£0.00');
  });
});

// ─── formatPct ───────────────────────────────────────────────────────────────

describe('formatPct', () => {
  it('defaults to 2 decimal places', () => {
    expect(formatPct(4.57)).toBe('4.57%');
  });

  it('honours a custom decimal count', () => {
    expect(formatPct(4.5, 1)).toBe('4.5%');
    expect(formatPct(4, 0)).toBe('4%');
  });
});
