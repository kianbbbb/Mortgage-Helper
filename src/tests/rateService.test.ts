import { describe, it, expect } from 'vitest';
import { applyLiveRates } from '../services/rateService';
import type { MortgageProduct } from '../types/mortgage';

const TRACKER_PRODUCT: MortgageProduct = {
  id: 'test-tracker',
  lender: 'Test Bank',
  name: 'Test Tracker (BoE +1.0%)',
  type: 'tracker',
  initialRate: 5.25, // old: BoE 4.25% + 1.0%
  revertRate: 7.99,
  initialPeriodYears: 2,
  maxLTV: 75,
  arrangementFee: 0,
  earlyRepaymentCharge: false,
  minLoan: 25000,
  maxLoan: 1000000,
  supportsInterestOnly: false,
  aprc: 7.8,
  trackerMargin: 1.0,
};

const FIXED_PRODUCT: MortgageProduct = {
  id: 'test-fixed',
  lender: 'Test Bank',
  name: 'Test Fixed',
  type: 'fixed',
  initialRate: 4.5,
  revertRate: 7.0,
  initialPeriodYears: 5,
  maxLTV: 85,
  arrangementFee: 999,
  earlyRepaymentCharge: true,
  minLoan: 25000,
  maxLoan: 1000000,
  supportsInterestOnly: false,
  aprc: 6.7,
};

describe('applyLiveRates', () => {
  it('updates tracker product rates based on new base rate', () => {
    const updated = applyLiveRates([TRACKER_PRODUCT], 4.75);
    expect(updated[0].initialRate).toBeCloseTo(5.75); // 4.75 + 1.0
  });

  it('does not modify fixed product rates', () => {
    const updated = applyLiveRates([FIXED_PRODUCT], 4.75);
    expect(updated[0].initialRate).toBe(4.5);
  });

  it('handles mixed product list correctly', () => {
    const updated = applyLiveRates([TRACKER_PRODUCT, FIXED_PRODUCT], 5.0);
    expect(updated[0].initialRate).toBeCloseTo(6.0); // tracker: 5.0 + 1.0
    expect(updated[1].initialRate).toBe(4.5); // fixed: unchanged
  });

  it('returns new array (immutable)', () => {
    const original = [TRACKER_PRODUCT, FIXED_PRODUCT];
    const updated = applyLiveRates(original, 4.75);
    expect(updated).not.toBe(original);
    expect(updated[0]).not.toBe(original[0]); // tracker was updated
  });

  it('does not modify products without trackerMargin', () => {
    const noMargin: MortgageProduct = { ...TRACKER_PRODUCT, trackerMargin: undefined };
    const updated = applyLiveRates([noMargin], 5.0);
    expect(updated[0].initialRate).toBe(TRACKER_PRODUCT.initialRate); // unchanged
  });

  it('updates revertRate for lifetime trackers (initialPeriodYears >= 999)', () => {
    const lifetimeTracker: MortgageProduct = {
      ...TRACKER_PRODUCT,
      initialPeriodYears: 999,
      revertRate: 5.25, // same as initial — tracks forever
    };
    const updated = applyLiveRates([lifetimeTracker], 4.75);
    expect(updated[0].initialRate).toBeCloseTo(5.75); // 4.75 + 1.0
    expect(updated[0].revertRate).toBeCloseTo(5.75); // also updated for lifetime
  });

  it('does not update revertRate for non-lifetime trackers', () => {
    const updated = applyLiveRates([TRACKER_PRODUCT], 4.75); // initialPeriodYears = 2
    expect(updated[0].initialRate).toBeCloseTo(5.75);
    expect(updated[0].revertRate).toBe(7.99); // revert stays as SVR
  });
});
