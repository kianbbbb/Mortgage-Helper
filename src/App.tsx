import { useState, useMemo } from 'react';
import type { MortgageInputs, MortgageResult, SortField, SortDirection } from './types/mortgage';
import { MORTGAGE_PRODUCTS } from './data/mortgages';
import { calcMortgageResult } from './utils/calculations';
import { MortgageForm } from './components/MortgageForm';
import { MortgageResults } from './components/MortgageResults';
import { AmortisationModal } from './components/AmortisationModal';

const DEFAULT_INPUTS: MortgageInputs = {
  propertyPrice: 350000,
  depositAmount: 52500,
  termYears: 25,
  repaymentType: 'repayment',
};

export default function App() {
  const [inputs, setInputs] = useState<MortgageInputs>(DEFAULT_INPUTS);
  const [sortField, setSortField] = useState<SortField>('totalCost');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showIneligible, setShowIneligible] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedResult, setSelectedResult] = useState<MortgageResult | null>(null);

  const isValidInput =
    inputs.propertyPrice > 0 &&
    inputs.depositAmount >= 0 &&
    inputs.depositAmount < inputs.propertyPrice;

  const results: MortgageResult[] = useMemo(() => {
    if (!isValidInput) return [];

    const raw = MORTGAGE_PRODUCTS.map((p) => calcMortgageResult(p, inputs));

    const eligible = raw
      .filter((r) => r.eligible)
      .sort((a, b) => {
        const aVal =
          sortField === 'initialRate' || sortField === 'aprc'
            ? a.product[sortField]
            : (a[sortField as keyof MortgageResult] as number);
        const bVal =
          sortField === 'initialRate' || sortField === 'aprc'
            ? b.product[sortField]
            : (b[sortField as keyof MortgageResult] as number);
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      });

    const ineligible = raw.filter((r) => !r.eligible);

    return [...eligible, ...ineligible];
  }, [inputs, sortField, sortDirection, isValidInput]);

  const handleSortChange = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-logo">🏠</div>
          <div>
            <h1>Mortgage Helper</h1>
            <p>Compare mortgage products and find your best deal</p>
          </div>
        </div>
      </header>

      {!isValidInput && inputs.propertyPrice > 0 && (
        <div className="global-warning">
          ⚠️ Please enter a valid deposit amount (must be greater than £0 and
          less than the property price).
        </div>
      )}

      <main className="app-main">
        <aside className="sidebar">
          <MortgageForm inputs={inputs} onChange={setInputs} />
        </aside>

        <section className="content">
          {isValidInput ? (
            <MortgageResults
              results={results}
              sortField={sortField}
              sortDirection={sortDirection}
              showIneligible={showIneligible}
              typeFilter={typeFilter}
              onSortChange={handleSortChange}
              onToggleIneligible={() => setShowIneligible((v) => !v)}
              onTypeFilterChange={setTypeFilter}
              onSelectProduct={setSelectedResult}
            />
          ) : (
            <div className="placeholder">
              <div className="placeholder-icon">📊</div>
              <h2>Enter your details to compare mortgages</h2>
              <p>
                Fill in the property price and deposit to see available
                products sorted by best deal.
              </p>
            </div>
          )}
        </section>
      </main>

      {selectedResult && (
        <AmortisationModal
          result={selectedResult}
          inputs={inputs}
          onClose={() => setSelectedResult(null)}
        />
      )}

      <footer className="app-footer">
        <p>
          🔔 Rates are illustrative and for comparison purposes only. Always
          consult a qualified mortgage advisor before making financial decisions.
        </p>
      </footer>
    </div>
  );
}
