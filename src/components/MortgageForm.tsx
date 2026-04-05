import React from 'react';
import type {
  MortgageInputs,
  RepaymentType,
  MortgageType,
  FilterOptions,
  AffordabilityInputs,
  RateData,
} from '../types/mortgage';
import { LENDERS, INITIAL_PERIODS } from '../data/mortgages';

interface Props {
  inputs: MortgageInputs;
  filters: FilterOptions;
  affordability: AffordabilityInputs;
  rateData: RateData | null;
  onChange: (inputs: MortgageInputs) => void;
  onFilterChange: (filters: FilterOptions) => void;
  onAffordabilityChange: (affordability: AffordabilityInputs) => void;
  maxAffordableLoan: number | null;
}

const TERM_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40];

const MORTGAGE_TYPES: { value: MortgageType; label: string }[] = [
  { value: 'fixed', label: 'Fixed Rate' },
  { value: 'tracker', label: 'Tracker' },
  { value: 'discount', label: 'Discount' },
  { value: 'interest-only', label: 'Interest-Only' },
];

export const MortgageForm: React.FC<Props> = ({
  inputs,
  filters,
  affordability,
  rateData,
  onChange,
  onFilterChange,
  onAffordabilityChange,
  maxAffordableLoan,
}) => {
  const loanAmount = inputs.propertyPrice - inputs.depositAmount;
  const ltv =
    inputs.propertyPrice > 0
      ? (loanAmount / inputs.propertyPrice) * 100
      : 0;
  const depositPct =
    inputs.propertyPrice > 0
      ? (inputs.depositAmount / inputs.propertyPrice) * 100
      : 0;

  const handleChange =
    (field: keyof MortgageInputs) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const raw = e.target.value;
      if (field === 'repaymentType') {
        onChange({ ...inputs, repaymentType: raw as RepaymentType });
      } else if (field === 'termYears') {
        onChange({ ...inputs, termYears: Number(raw) });
      } else {
        const num = raw === '' ? 0 : parseFloat(raw.replace(/,/g, ''));
        onChange({ ...inputs, [field]: isNaN(num) ? 0 : num });
      }
    };

  const handleAffordabilityChange =
    (field: keyof AffordabilityInputs) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      const num = raw === '' ? 0 : parseFloat(raw.replace(/,/g, ''));
      onAffordabilityChange({
        ...affordability,
        [field]: isNaN(num) ? 0 : num,
      });
    };

  const toggleMortgageType = (type: MortgageType) => {
    const current = filters.mortgageTypes;
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    onFilterChange({ ...filters, mortgageTypes: next });
  };

  const toggleInitialPeriod = (period: number) => {
    const current = filters.initialPeriods;
    const next = current.includes(period)
      ? current.filter((p) => p !== period)
      : [...current, period];
    onFilterChange({ ...filters, initialPeriods: next });
  };

  const toggleLender = (lender: string) => {
    const current = filters.lenders;
    const next = current.includes(lender)
      ? current.filter((l) => l !== lender)
      : [...current, lender];
    onFilterChange({ ...filters, lenders: next });
  };

  return (
    <form className="mortgage-form" onSubmit={(e) => e.preventDefault()}>
      {/* ── Live Rate Indicator ── */}
      {rateData && (
        <div className={`rate-indicator ${rateData.isLive ? 'live' : 'cached'}`}>
          <div className="rate-indicator-header">
            <span className={`rate-dot ${rateData.isLive ? 'live' : 'cached'}`} />
            <span className="rate-indicator-label">
              BoE Base Rate
            </span>
          </div>
          <span className="rate-indicator-value">{rateData.baseRate.toFixed(2)}%</span>
          <span className="rate-indicator-source">
            {rateData.isLive ? '🟢 Live' : '🟡 Cached'} · {rateData.source}
          </span>
        </div>
      )}

      <h2 className="form-title">Your Mortgage Details</h2>

      <div className="form-group">
        <label htmlFor="propertyPrice">Property Price</label>
        <div className="input-wrapper">
          <span className="input-prefix">£</span>
          <input
            id="propertyPrice"
            type="number"
            min={0}
            step={1000}
            value={inputs.propertyPrice || ''}
            onChange={handleChange('propertyPrice')}
            placeholder="e.g. 350000"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="depositAmount">Deposit Amount</label>
        <div className="input-wrapper">
          <span className="input-prefix">£</span>
          <input
            id="depositAmount"
            type="number"
            min={0}
            max={inputs.propertyPrice}
            step={1000}
            value={inputs.depositAmount || ''}
            onChange={handleChange('depositAmount')}
            placeholder="e.g. 35000"
          />
        </div>
        {inputs.propertyPrice > 0 && inputs.depositAmount > 0 && (
          <p className="form-hint">
            {depositPct.toFixed(1)}% deposit — {ltv.toFixed(1)}% LTV —{' '}
            Loan:{' '}
            <strong>
              £{loanAmount.toLocaleString('en-GB', { maximumFractionDigits: 0 })}
            </strong>
          </p>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="termYears">Mortgage Term</label>
        <div className="input-wrapper select-wrapper">
          <select
            id="termYears"
            value={inputs.termYears}
            onChange={handleChange('termYears')}
          >
            {TERM_OPTIONS.map((yr) => (
              <option key={yr} value={yr}>
                {yr} years
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label>Repayment Type</label>
        <div className="radio-group">
          <label className="radio-label">
            <input
              type="radio"
              name="repaymentType"
              value="repayment"
              checked={inputs.repaymentType === 'repayment'}
              onChange={handleChange('repaymentType')}
            />
            <span>Capital Repayment</span>
          </label>
          <label className="radio-label">
            <input
              type="radio"
              name="repaymentType"
              value="interest-only"
              checked={inputs.repaymentType === 'interest-only'}
              onChange={handleChange('repaymentType')}
            />
            <span>Interest Only</span>
          </label>
        </div>
      </div>

      {inputs.repaymentType === 'interest-only' && (
        <div className="info-banner warning">
          ⚠️ Interest-only products require you to have a separate repayment
          vehicle (e.g. investments, ISA) to repay the capital at the end of
          the term.
        </div>
      )}

      {/* ── Mortgage Type Filter ── */}
      <h2 className="form-title">Rate Type</h2>
      <div className="form-group">
        <div className="chip-group">
          {MORTGAGE_TYPES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              className={`filter-chip ${filters.mortgageTypes.includes(value) ? 'active' : ''}`}
              onClick={() => toggleMortgageType(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {filters.mortgageTypes.length > 0 && (
          <button
            type="button"
            className="clear-filter-btn"
            onClick={() => onFilterChange({ ...filters, mortgageTypes: [] })}
          >
            Clear selection (show all)
          </button>
        )}
      </div>

      {/* ── Initial Period Filter ── */}
      <h2 className="form-title">Initial Period</h2>
      <div className="form-group">
        <div className="chip-group">
          {INITIAL_PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              className={`filter-chip ${filters.initialPeriods.includes(period) ? 'active' : ''}`}
              onClick={() => toggleInitialPeriod(period)}
            >
              {period}yr
            </button>
          ))}
          <button
            type="button"
            className={`filter-chip ${filters.initialPeriods.includes(999) ? 'active' : ''}`}
            onClick={() => toggleInitialPeriod(999)}
          >
            Lifetime
          </button>
        </div>
        {filters.initialPeriods.length > 0 && (
          <button
            type="button"
            className="clear-filter-btn"
            onClick={() => onFilterChange({ ...filters, initialPeriods: [] })}
          >
            Clear selection (show all)
          </button>
        )}
      </div>

      {/* ── Lender Filter ── */}
      <h2 className="form-title">Lender</h2>
      <div className="form-group">
        <div className="chip-group">
          {LENDERS.map((lender) => (
            <button
              key={lender}
              type="button"
              className={`filter-chip ${filters.lenders.includes(lender) ? 'active' : ''}`}
              onClick={() => toggleLender(lender)}
            >
              {lender}
            </button>
          ))}
        </div>
        {filters.lenders.length > 0 && (
          <button
            type="button"
            className="clear-filter-btn"
            onClick={() => onFilterChange({ ...filters, lenders: [] })}
          >
            Clear selection (show all)
          </button>
        )}
      </div>

      {/* ── Fee & ERC Preferences ── */}
      <h2 className="form-title">Preferences</h2>
      <div className="form-group">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={filters.noFeeOnly}
            onChange={() =>
              onFilterChange({ ...filters, noFeeOnly: !filters.noFeeOnly })
            }
          />
          No arrangement fee only
        </label>
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={filters.noERCOnly}
            onChange={() =>
              onFilterChange({ ...filters, noERCOnly: !filters.noERCOnly })
            }
          />
          No early repayment charge only
        </label>
      </div>

      {/* ── Affordability / Borrowing Capacity ── */}
      <h2 className="form-title">Borrowing Capacity</h2>

      <div className="form-group">
        <label htmlFor="annualIncome">Annual Income (Gross)</label>
        <div className="input-wrapper">
          <span className="input-prefix">£</span>
          <input
            id="annualIncome"
            type="number"
            min={0}
            step={1000}
            value={affordability.annualIncome || ''}
            onChange={handleAffordabilityChange('annualIncome')}
            placeholder="e.g. 50000"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="secondIncome">Second Income (Optional)</label>
        <div className="input-wrapper">
          <span className="input-prefix">£</span>
          <input
            id="secondIncome"
            type="number"
            min={0}
            step={1000}
            value={affordability.secondIncome || ''}
            onChange={handleAffordabilityChange('secondIncome')}
            placeholder="e.g. 30000"
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="monthlyCommitments">Monthly Commitments</label>
        <div className="input-wrapper">
          <span className="input-prefix">£</span>
          <input
            id="monthlyCommitments"
            type="number"
            min={0}
            step={50}
            value={affordability.monthlyCommitments || ''}
            onChange={handleAffordabilityChange('monthlyCommitments')}
            placeholder="e.g. 500"
          />
        </div>
        <p className="form-hint">
          Include loans, credit cards, child maintenance, etc.
        </p>
      </div>

      {maxAffordableLoan !== null && maxAffordableLoan > 0 && (
        <div className="affordability-result">
          <div className="affordability-header">
            💰 Estimated Max Borrowing
          </div>
          <div className="affordability-value">
            £{Math.round(maxAffordableLoan).toLocaleString('en-GB')}
          </div>
          <p className="affordability-note">
            Based on 4.5× income, stress-tested at +3% above representative rates.
          </p>
          {loanAmount > 0 && loanAmount > maxAffordableLoan && (
            <div className="info-banner warning" style={{ marginTop: '0.5rem' }}>
              ⚠️ Your required loan (£{loanAmount.toLocaleString('en-GB')}) exceeds
              your estimated max borrowing.
            </div>
          )}
          {loanAmount > 0 && loanAmount <= maxAffordableLoan && (
            <div className="info-banner success" style={{ marginTop: '0.5rem' }}>
              ✅ Your required loan is within your estimated borrowing capacity.
            </div>
          )}
        </div>
      )}
    </form>
  );
};
