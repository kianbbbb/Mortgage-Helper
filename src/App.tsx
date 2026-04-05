import { useState, useMemo, useEffect } from 'react';
import type {
  MortgageInputs,
  MortgageResult,
  SortField,
  SortDirection,
  FilterOptions,
  AffordabilityInputs,
  RateData,
  MortgageProduct,
} from './types/mortgage';
import { MORTGAGE_PRODUCTS } from './data/mortgages';
import { calcMortgageResult } from './utils/calculations';
import { calcMaxAffordableLoan } from './utils/affordability';
import { fetchBaseRate, applyLiveRates } from './services/rateService';
import { MortgageForm } from './components/MortgageForm';
import { MortgageResults } from './components/MortgageResults';
import { AmortisationModal } from './components/AmortisationModal';

const DEFAULT_INPUTS: MortgageInputs = {
  propertyPrice: 350000,
  depositAmount: 52500,
  termYears: 25,
  repaymentType: 'repayment',
};

const DEFAULT_FILTERS: FilterOptions = {
  mortgageTypes: [],
  initialPeriods: [],
  lenders: [],
  noFeeOnly: false,
  noERCOnly: false,
};

const DEFAULT_AFFORDABILITY: AffordabilityInputs = {
  annualIncome: 0,
  secondIncome: 0,
  monthlyCommitments: 0,
};

export default function App() {
  const [inputs, setInputs] = useState<MortgageInputs>(DEFAULT_INPUTS);
  const [sortField, setSortField] = useState<SortField>('totalCost');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [showIneligible, setShowIneligible] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [affordability, setAffordability] = useState<AffordabilityInputs>(DEFAULT_AFFORDABILITY);
  const [selectedResult, setSelectedResult] = useState<MortgageResult | null>(null);
  const [rateData, setRateData] = useState<RateData | null>(null);
  const [products, setProducts] = useState<MortgageProduct[]>(MORTGAGE_PRODUCTS);

  // Fetch live BoE base rate on mount
  useEffect(() => {
    let cancelled = false;
    fetchBaseRate().then((data) => {
      if (cancelled) return;
      setRateData(data);
      setProducts(applyLiveRates(MORTGAGE_PRODUCTS, data.baseRate));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const isValidInput =
    inputs.propertyPrice > 0 &&
    inputs.depositAmount >= 0 &&
    inputs.depositAmount < inputs.propertyPrice;

  const results: MortgageResult[] = useMemo(() => {
    if (!isValidInput) return [];

    const raw = products.map((p) => calcMortgageResult(p, inputs));

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
  }, [inputs, sortField, sortDirection, isValidInput, products]);

  // Calculate max affordable loan using live base rate when available
  const maxAffordableLoan = useMemo(() => {
    if (affordability.annualIncome <= 0) return null;
    const representativeRate = rateData ? rateData.baseRate : 4.5;
    return calcMaxAffordableLoan(affordability, representativeRate, inputs.termYears);
  }, [affordability, inputs.termYears, rateData]);

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
          <MortgageForm
            inputs={inputs}
            filters={filters}
            affordability={affordability}
            rateData={rateData}
            onChange={setInputs}
            onFilterChange={setFilters}
            onAffordabilityChange={setAffordability}
            maxAffordableLoan={maxAffordableLoan}
          />
        </aside>

        <section className="content">
          {isValidInput ? (
            <MortgageResults
              results={results}
              sortField={sortField}
              sortDirection={sortDirection}
              showIneligible={showIneligible}
              filters={filters}
              isRateLive={rateData?.isLive ?? false}
              onSortChange={handleSortChange}
              onToggleIneligible={() => setShowIneligible((v) => !v)}
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
          {rateData && (
            <span>
              {' '}
              · BoE base rate: {rateData.baseRate.toFixed(2)}% ({rateData.isLive ? 'live' : 'cached'} from {rateData.source})
            </span>
          )}
        </p>
      </footer>
    </div>
  );
}
