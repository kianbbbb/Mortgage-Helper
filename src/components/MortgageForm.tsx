import React from 'react';
import type { MortgageInputs, RepaymentType } from '../types/mortgage';

interface Props {
  inputs: MortgageInputs;
  onChange: (inputs: MortgageInputs) => void;
}

const TERM_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40];

export const MortgageForm: React.FC<Props> = ({ inputs, onChange }) => {
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

  return (
    <form className="mortgage-form" onSubmit={(e) => e.preventDefault()}>
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
    </form>
  );
};
