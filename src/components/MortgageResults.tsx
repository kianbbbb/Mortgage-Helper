import React from 'react';
import type { MortgageResult, SortField, SortDirection, FilterOptions } from '../types/mortgage';
import { MORTGAGE_TYPE_LABELS } from '../data/mortgages';
import { formatGBP, formatPct } from '../utils/calculations';

interface Props {
  results: MortgageResult[];
  sortField: SortField;
  sortDirection: SortDirection;
  showIneligible: boolean;
  filters: FilterOptions;
  isRateLive: boolean;
  onSortChange: (field: SortField) => void;
  onToggleIneligible: () => void;
  onSelectProduct: (result: MortgageResult) => void;
}

const SORT_LABELS: Record<SortField, string> = {
  initialMonthlyPayment: 'Monthly Payment',
  totalCost: 'Total Cost',
  totalInterest: 'Total Interest',
  initialRate: 'Initial Rate',
  aprc: 'APRC',
};

export const MortgageResults: React.FC<Props> = ({
  results,
  sortField,
  sortDirection,
  showIneligible,
  filters,
  isRateLive,
  onSortChange,
  onToggleIneligible,
  onSelectProduct,
}) => {
  const eligible = results.filter((r) => r.eligible);

  // Apply sidebar filters
  const applyFilters = (r: MortgageResult) => {
    if (filters.mortgageTypes.length > 0 && !filters.mortgageTypes.includes(r.product.type)) {
      return false;
    }
    if (filters.initialPeriods.length > 0 && !filters.initialPeriods.includes(r.product.initialPeriodYears)) {
      return false;
    }
    if (filters.lenders.length > 0 && !filters.lenders.includes(r.product.lender)) {
      return false;
    }
    if (filters.noFeeOnly && r.product.arrangementFee > 0) {
      return false;
    }
    if (filters.noERCOnly && r.product.earlyRepaymentCharge) {
      return false;
    }
    return true;
  };

  const filtered = (showIneligible ? results : eligible).filter(applyFilters);

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

  const activeFilterCount =
    (filters.mortgageTypes.length > 0 ? 1 : 0) +
    (filters.initialPeriods.length > 0 ? 1 : 0) +
    (filters.lenders.length > 0 ? 1 : 0) +
    (filters.noFeeOnly ? 1 : 0) +
    (filters.noERCOnly ? 1 : 0);

  return (
    <div className="results-panel">
      {/* Controls bar */}
      <div className="results-controls">
        <div className="controls-left">
          <span className="results-count">
            {filtered.length} product{filtered.length !== 1 ? 's' : ''} shown
            {activeFilterCount > 0 && (
              <span className="filter-count"> ({activeFilterCount} filter{activeFilterCount !== 1 ? 's' : ''} active)</span>
            )}
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
                {result.product.trackerMargin != null && (
                  <div className="rate-tracker-info">
                    📡 BoE + {result.product.trackerMargin.toFixed(2)}%{isRateLive ? ' (live)' : ' (cached)'}
                  </div>
                )}
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
