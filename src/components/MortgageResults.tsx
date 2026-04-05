import React from 'react';
import type { MortgageResult, SortField, SortDirection } from '../types/mortgage';
import { MORTGAGE_TYPE_LABELS } from '../data/mortgages';
import { formatGBP, formatPct } from '../utils/calculations';

interface Props {
  results: MortgageResult[];
  sortField: SortField;
  sortDirection: SortDirection;
  showIneligible: boolean;
  typeFilter: string;
  onSortChange: (field: SortField) => void;
  onToggleIneligible: () => void;
  onTypeFilterChange: (type: string) => void;
  onSelectProduct: (result: MortgageResult) => void;
}

const SORT_LABELS: Record<SortField, string> = {
  initialMonthlyPayment: 'Monthly Payment',
  totalCost: 'Total Cost',
  totalInterest: 'Total Interest',
  initialRate: 'Initial Rate',
  aprc: 'APRC',
};

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'fixed', label: 'Fixed Rate' },
  { value: 'tracker', label: 'Tracker' },
  { value: 'discount', label: 'Discount' },
  { value: 'interest-only', label: 'Interest-Only' },
];

export const MortgageResults: React.FC<Props> = ({
  results,
  sortField,
  sortDirection,
  showIneligible,
  typeFilter,
  onSortChange,
  onToggleIneligible,
  onTypeFilterChange,
  onSelectProduct,
}) => {
  const eligible = results.filter((r) => r.eligible);

  const filtered = (showIneligible ? results : eligible).filter(
    (r) => !typeFilter || r.product.type === typeFilter,
  );

  const bestId = eligible.length > 0 ? eligible[0].product.id : null;

  const SortBtn = ({ field }: { field: SortField }) => {
    const active = sortField === field;
    return (
      <button
        className={`sort-btn ${active ? 'active' : ''}`}
        onClick={() => onSortChange(field)}
        title={`Sort by ${SORT_LABELS[field]}`}
      >
        {SORT_LABELS[field]}
        {active && <span className="sort-arrow">{sortDirection === 'asc' ? ' ↑' : ' ↓'}</span>}
      </button>
    );
  };

  if (results.length === 0) {
    return (
      <div className="results-empty">
        <p>Enter your mortgage details on the left to see available products.</p>
      </div>
    );
  }

  return (
    <div className="results-panel">
      {/* Controls bar */}
      <div className="results-controls">
        <div className="controls-left">
          <span className="results-count">
            {eligible.length} eligible product{eligible.length !== 1 ? 's' : ''} of {results.length}
          </span>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showIneligible}
              onChange={onToggleIneligible}
            />
            Show ineligible
          </label>
        </div>
        <div className="controls-right">
          <select
            className="type-filter"
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value)}
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Sort bar */}
      <div className="sort-bar">
        <span className="sort-label">Sort by:</span>
        {(Object.keys(SORT_LABELS) as SortField[]).map((f) => (
          <SortBtn key={f} field={f} />
        ))}
      </div>

      {/* Card grid */}
      <div className="results-grid">
        {filtered.map((result) => {
          const isBest = result.product.id === bestId;
          const isIneligible = !result.eligible;
          const rank = eligible.findIndex((r) => r.product.id === result.product.id) + 1;

          return (
            <div
              key={result.product.id}
              className={`mortgage-card ${isBest ? 'best-deal' : ''} ${isIneligible ? 'ineligible' : ''}`}
            >
              {isBest && (
                <div className="best-badge">⭐ Best Deal</div>
              )}
              {!isBest && rank > 0 && (
                <div className="rank-badge">#{rank}</div>
              )}
              {isIneligible && (
                <div className="ineligible-badge">Not Eligible</div>
              )}

              <div className="card-header">
                <div className="card-lender">{result.product.lender}</div>
                <div className="card-name">{result.product.name}</div>
                <div className="card-type-tag">
                  {MORTGAGE_TYPE_LABELS[result.product.type]}
                </div>
              </div>

              <div className="card-rates">
                <div className="rate-main">
                  <span className="rate-value">
                    {formatPct(result.product.initialRate)}
                  </span>
                  <span className="rate-label">
                    initial rate
                    {result.product.initialPeriodYears < 999 &&
                      ` (${result.product.initialPeriodYears}yr)`}
                  </span>
                </div>
                {result.product.initialPeriodYears < 999 && (
                  <div className="rate-revert">
                    Reverts to {formatPct(result.product.revertRate)} SVR
                  </div>
                )}
                <div className="rate-aprc">
                  APRC {formatPct(result.product.aprc)}
                </div>
              </div>

              <div className="card-stats">
                <div className="stat">
                  <span className="stat-label">Monthly (initial)</span>
                  <span className="stat-value primary">
                    {formatGBP(result.initialMonthlyPayment)}
                  </span>
                </div>
                {result.revertMonthlyPayment > 0 && (
                  <div className="stat">
                    <span className="stat-label">Monthly (revert)</span>
                    <span className="stat-value">
                      {formatGBP(result.revertMonthlyPayment)}
                    </span>
                  </div>
                )}
                <div className="stat">
                  <span className="stat-label">Total Interest</span>
                  <span className="stat-value">
                    {formatGBP(result.totalInterest)}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat-label">Total Cost</span>
                  <span className="stat-value">
                    {formatGBP(result.totalCost)}
                  </span>
                </div>
              </div>

              <div className="card-footer">
                <div className="card-fees">
                  {result.product.arrangementFee > 0 ? (
                    <span>Fee: {formatGBP(result.product.arrangementFee)}</span>
                  ) : (
                    <span className="no-fee">No arrangement fee</span>
                  )}
                  {!result.product.earlyRepaymentCharge && (
                    <span className="no-erc"> · No early repayment charge</span>
                  )}
                </div>
                {isIneligible ? (
                  <p className="ineligible-reason">
                    {result.ineligibilityReason}
                  </p>
                ) : (
                  <button
                    className="detail-btn"
                    onClick={() => onSelectProduct(result)}
                  >
                    View Breakdown →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="results-empty">
          <p>No products match the current filters.</p>
        </div>
      )}

      <div className="results-summary">
        <div className="summary-legend">
          <span>
            💡 Total Cost = all payments over full term + arrangement fee.
            Ineligible products shown in grey.
          </span>
        </div>
      </div>
    </div>
  );
};
