import React, { useState } from 'react';
import type { MortgageResult } from '../types/mortgage';
import {
  buildAmortisationSchedule,
  type AmortisationRow,
  formatGBP,
  formatPct,
} from '../utils/calculations';
import type { MortgageInputs } from '../types/mortgage';

interface Props {
  result: MortgageResult;
  inputs: MortgageInputs;
  onClose: () => void;
}

type Tab = 'summary' | 'schedule';

export const AmortisationModal: React.FC<Props> = ({ result, inputs, onClose }) => {
  const [tab, setTab] = useState<Tab>('summary');
  const [scheduleYear, setScheduleYear] = useState<number>(1);

  const schedule = buildAmortisationSchedule(result.product, inputs);

  // Aggregate by year
  const byYear: {
    year: number;
    totalPayment: number;
    totalInterest: number;
    totalPrincipal: number;
    endBalance: number;
    rate: number;
  }[] = [];

  for (let yr = 1; yr <= inputs.termYears; yr++) {
    const rows = schedule.filter(
      (r) => r.month > (yr - 1) * 12 && r.month <= yr * 12,
    );
    if (rows.length === 0) continue;
    byYear.push({
      year: yr,
      totalPayment: rows.reduce((s, r) => s + r.payment, 0),
      totalInterest: rows.reduce((s, r) => s + r.interest, 0),
      totalPrincipal: rows.reduce((s, r) => s + r.principal, 0),
      endBalance: rows[rows.length - 1].balance,
      rate: rows[0].rate,
    });
  }

  const selectedYearRows: AmortisationRow[] = schedule.filter(
    (r) => r.month > (scheduleYear - 1) * 12 && r.month <= scheduleYear * 12,
  );

  const initialEndYr = Math.min(result.product.initialPeriodYears, inputs.termYears);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{result.product.lender}</h2>
            <p>{result.product.name}</p>
          </div>
          <button className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="modal-tabs">
          <button
            className={tab === 'summary' ? 'active' : ''}
            onClick={() => setTab('summary')}
          >
            Summary
          </button>
          <button
            className={tab === 'schedule' ? 'active' : ''}
            onClick={() => setTab('schedule')}
          >
            Amortisation Schedule
          </button>
        </div>

        <div className="modal-body">
          {tab === 'summary' && (
            <div className="summary-tab">
              <div className="summary-grid">
                <div className="summary-section">
                  <h3>Loan Details</h3>
                  <table className="info-table">
                    <tbody>
                      <tr>
                        <td>Property Price</td>
                        <td>{formatGBP(inputs.propertyPrice)}</td>
                      </tr>
                      <tr>
                        <td>Deposit</td>
                        <td>{formatGBP(inputs.depositAmount)}</td>
                      </tr>
                      <tr>
                        <td>Loan Amount</td>
                        <td>{formatGBP(result.loanAmount)}</td>
                      </tr>
                      <tr>
                        <td>LTV</td>
                        <td>{formatPct(result.ltv)}</td>
                      </tr>
                      <tr>
                        <td>Term</td>
                        <td>{inputs.termYears} years</td>
                      </tr>
                      <tr>
                        <td>Repayment Type</td>
                        <td>
                          {inputs.repaymentType === 'repayment'
                            ? 'Capital Repayment'
                            : 'Interest Only'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="summary-section">
                  <h3>Product Details</h3>
                  <table className="info-table">
                    <tbody>
                      <tr>
                        <td>Initial Rate</td>
                        <td>{formatPct(result.product.initialRate)}</td>
                      </tr>
                      {result.product.initialPeriodYears < 999 && (
                        <>
                          <tr>
                            <td>Initial Period</td>
                            <td>{result.product.initialPeriodYears} years</td>
                          </tr>
                          <tr>
                            <td>Revert Rate (SVR)</td>
                            <td>{formatPct(result.product.revertRate)}</td>
                          </tr>
                        </>
                      )}
                      <tr>
                        <td>APRC</td>
                        <td>{formatPct(result.product.aprc)}</td>
                      </tr>
                      <tr>
                        <td>Arrangement Fee</td>
                        <td>
                          {result.product.arrangementFee > 0
                            ? formatGBP(result.product.arrangementFee)
                            : 'None'}
                        </td>
                      </tr>
                      <tr>
                        <td>Early Repayment Charge</td>
                        <td>
                          {result.product.earlyRepaymentCharge
                            ? `Yes (during initial ${result.product.initialPeriodYears}yr period)`
                            : 'No'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="summary-section">
                  <h3>Cost Breakdown</h3>
                  <table className="info-table">
                    <tbody>
                      <tr>
                        <td>Monthly Payment (initial period)</td>
                        <td>{formatGBP(result.initialMonthlyPayment)}</td>
                      </tr>
                      {result.revertMonthlyPayment > 0 && (
                        <tr>
                          <td>Monthly Payment (after revert)</td>
                          <td>{formatGBP(result.revertMonthlyPayment)}</td>
                        </tr>
                      )}
                      {result.product.initialPeriodYears < 999 && (
                        <tr>
                          <td>
                            Cost during initial {initialEndYr}yr period
                          </td>
                          <td>{formatGBP(result.initialPeriodCost)}</td>
                        </tr>
                      )}
                      <tr>
                        <td>Total Interest</td>
                        <td>{formatGBP(result.totalInterest)}</td>
                      </tr>
                      <tr className="total-row">
                        <td>Total Cost (over {inputs.termYears} years)</td>
                        <td>{formatGBP(result.totalCost)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {inputs.repaymentType === 'repayment' && (
                <div className="yearly-chart">
                  <h3>Balance Over Time</h3>
                  <div className="bar-chart">
                    {byYear.map((yr) => {
                      const pct = (yr.endBalance / result.loanAmount) * 100;
                      const isInitial = yr.year <= initialEndYr;
                      return (
                        <div key={yr.year} className="bar-col">
                          <div className="bar-wrapper">
                            <div
                              className={`bar-fill ${isInitial ? 'initial' : 'revert'}`}
                              style={{ height: `${pct}%` }}
                              title={`Year ${yr.year}: ${formatGBP(yr.endBalance)} remaining`}
                            />
                          </div>
                          {yr.year % 5 === 0 || yr.year === 1 || yr.year === inputs.termYears ? (
                            <div className="bar-label">Yr {yr.year}</div>
                          ) : (
                            <div className="bar-label">&nbsp;</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <div className="bar-legend">
                    <span className="legend-dot initial" /> Initial period
                    <span className="legend-dot revert" /> After revert
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'schedule' && (
            <div className="schedule-tab">
              <div className="schedule-controls">
                <label htmlFor="scheduleYear">View monthly breakdown for year:</label>
                <select
                  id="scheduleYear"
                  value={scheduleYear}
                  onChange={(e) => setScheduleYear(Number(e.target.value))}
                >
                  {byYear.map((yr) => (
                    <option key={yr.year} value={yr.year}>
                      Year {yr.year} ({formatPct(yr.rate)} rate)
                    </option>
                  ))}
                </select>
              </div>

              <h3>Annual Summary</h3>
              <div className="schedule-scroll">
                <table className="schedule-table">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Rate</th>
                      <th>Total Payments</th>
                      <th>Interest</th>
                      <th>Principal</th>
                      <th>Remaining Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byYear.map((yr) => (
                      <tr
                        key={yr.year}
                        className={`${yr.year <= initialEndYr ? 'initial-period' : 'revert-period'} ${yr.year === scheduleYear ? 'selected-year' : ''}`}
                        onClick={() => setScheduleYear(yr.year)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>Year {yr.year}</td>
                        <td>{formatPct(yr.rate)}</td>
                        <td>{formatGBP(yr.totalPayment)}</td>
                        <td>{formatGBP(yr.totalInterest)}</td>
                        <td>{formatGBP(yr.totalPrincipal)}</td>
                        <td>{formatGBP(yr.endBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <h3 style={{ marginTop: '2rem' }}>Monthly Breakdown — Year {scheduleYear}</h3>
              <div className="schedule-scroll">
                <table className="schedule-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Payment</th>
                      <th>Interest</th>
                      <th>Principal</th>
                      <th>Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedYearRows.map((row) => (
                      <tr key={row.month}>
                        <td>Month {row.month}</td>
                        <td>{formatGBP(row.payment)}</td>
                        <td>{formatGBP(row.interest)}</td>
                        <td>{formatGBP(row.principal)}</td>
                        <td>{formatGBP(row.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
