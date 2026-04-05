import { describe, it, expect } from 'vitest';
import {
  calcBorrowingCapacity,
  calcMaxAffordableLoan,
} from '../utils/affordability';
import type { AffordabilityInputs } from '../types/mortgage';

const SAMPLE_AFFORDABILITY: AffordabilityInputs = {
  annualIncome: 50000,
  secondIncome: 0,
  monthlyCommitments: 500,
};

describe('calcBorrowingCapacity', () => {
  it('calculates max borrowing as 4.5× income', () => {
    const result = calcBorrowingCapacity(SAMPLE_AFFORDABILITY, 4.5, 25);
    expect(result.maxBorrowing).toBe(225000);
    expect(result.incomeMultiple).toBe(4.5);
  });

  it('includes second income in calculation', () => {
    const withSecond: AffordabilityInputs = {
      ...SAMPLE_AFFORDABILITY,
      secondIncome: 30000,
    };
    const result = calcBorrowingCapacity(withSecond, 4.5, 25);
    expect(result.maxBorrowing).toBe(360000); // (50000+30000) * 4.5
  });

  it('stress tests at product rate + 3%', () => {
    const result = calcBorrowingCapacity(SAMPLE_AFFORDABILITY, 4.5, 25);
    // Stress rate = 4.5 + 3 = 7.5%
    expect(result.stressTestedMonthly).toBeGreaterThan(0);
  });

  it('marks affordable when stress-tested payment is within disposable income', () => {
    const highEarner: AffordabilityInputs = {
      annualIncome: 150000,
      secondIncome: 0,
      monthlyCommitments: 0,
    };
    const result = calcBorrowingCapacity(highEarner, 4.5, 25);
    expect(result.affordableAtStressRate).toBe(true);
  });

  it('marks not affordable when stress-tested payment exceeds disposable income', () => {
    const lowEarner: AffordabilityInputs = {
      annualIncome: 20000,
      secondIncome: 0,
      monthlyCommitments: 1200, // disposable = 20000/12 - 1200 = ~466/mo
    };
    const result = calcBorrowingCapacity(lowEarner, 4.5, 25);
    // Max borrowing = 90000, stress monthly on 90k at 7.5% over 25yr is ~665
    // Disposable = 20000/12 - 1200 = ~466 — well below stressed payment
    expect(result.affordableAtStressRate).toBe(false);
  });
});

describe('calcMaxAffordableLoan', () => {
  it('returns 0 when income is 0', () => {
    const noIncome: AffordabilityInputs = {
      annualIncome: 0,
      secondIncome: 0,
      monthlyCommitments: 0,
    };
    expect(calcMaxAffordableLoan(noIncome, 4.5, 25)).toBe(0);
  });

  it('returns 0 when commitments exceed monthly income', () => {
    const overCommitted: AffordabilityInputs = {
      annualIncome: 12000,
      secondIncome: 0,
      monthlyCommitments: 1500, // > 1000/month income
    };
    expect(calcMaxAffordableLoan(overCommitted, 4.5, 25)).toBe(0);
  });

  it('returns a positive loan amount for a standard earner', () => {
    const result = calcMaxAffordableLoan(SAMPLE_AFFORDABILITY, 4.5, 25);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(225000); // capped by income multiple
  });

  it('increases with longer term', () => {
    const short = calcMaxAffordableLoan(SAMPLE_AFFORDABILITY, 4.5, 15);
    const long = calcMaxAffordableLoan(SAMPLE_AFFORDABILITY, 4.5, 30);
    // Longer term = lower monthly payments = can borrow more (up to the income cap)
    expect(long).toBeGreaterThanOrEqual(short);
  });

  it('is capped by the income multiple', () => {
    const highEarner: AffordabilityInputs = {
      annualIncome: 200000,
      secondIncome: 0,
      monthlyCommitments: 0,
    };
    const result = calcMaxAffordableLoan(highEarner, 4.5, 25);
    expect(result).toBeLessThanOrEqual(200000 * 4.5);
  });
});
