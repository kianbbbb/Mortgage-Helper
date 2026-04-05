# 🏠 Mortgage Helper

A web application that helps you compare UK mortgage products and find the best deal for your circumstances.

## Screenshots

### Main comparison view
![Mortgage Helper main view](https://github.com/user-attachments/assets/c9d14fe3-2d33-470f-ac22-d033b244cfb4)

### Product detail breakdown & balance chart
![Mortgage breakdown modal](https://github.com/user-attachments/assets/974ec41d-7ad1-4f67-a45d-49a1a1f13740)

### Amortisation schedule (annual + monthly)
![Amortisation schedule](https://github.com/user-attachments/assets/59ddeadf-2b4c-4468-abe0-faaedc6526e6)

---

## Features

- **24 mortgage products** across 6 lenders (Nationwide, Barclays, HSBC, Lloyds, Santander, Virgin Money, First Direct)
- **Multiple mortgage types**: Fixed Rate, Tracker, Discount, Interest-Only, Lifetime Tracker
- **Initial period terms**: 2-year, 5-year, 10-year, and lifetime
- **Eligibility filtering** based on LTV, loan amount limits, and repayment type
- **Sortable results** by monthly payment, total cost, total interest, initial rate, or APRC
- **Type filter** to narrow by mortgage type (Fixed, Tracker, Discount, Interest-Only)
- **Toggle ineligible** products to see what you're missing and why
- **Detailed breakdown modal** for each product showing:
  - Loan details (property price, deposit, LTV, loan amount)
  - Product details (rate, revert rate, fee, ERC status)
  - Full cost breakdown (initial monthly, revert monthly, initial period cost, total interest, total cost)
  - **Balance over time chart** showing principal reduction coloured by initial vs revert period
  - **Amortisation schedule** — annual summary + monthly breakdown, selectable by year

## Mortgage Calculations

| Calculation | Formula |
|---|---|
| Monthly repayment | `P × [r(1+r)^n] / [(1+r)^n − 1]` |
| Monthly interest-only | `P × r / 12` |
| LTV | `(loan ÷ property price) × 100` |
| Total cost | `all monthly payments + arrangement fee` |

Where `P` = principal, `r` = monthly rate (annual% ÷ 1200), `n` = total months.

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build

```bash
npm run build
```

### Tests

```bash
npm test
```

Runs 33 unit tests covering all calculation functions, eligibility checks, and formatters.

### Lint

```bash
npm run lint
```

## Project Structure

```
src/
├── types/
│   └── mortgage.ts          # TypeScript interfaces (MortgageProduct, MortgageInputs, etc.)
├── data/
│   └── mortgages.ts         # Database of 24 mortgage products
├── utils/
│   └── calculations.ts      # Core calculation functions + formatters
├── components/
│   ├── MortgageForm.tsx      # Left sidebar input form
│   ├── MortgageResults.tsx   # Results grid with controls
│   └── AmortisationModal.tsx # Detailed breakdown popup
├── tests/
│   └── calculations.test.ts  # Unit tests (Vitest)
├── App.tsx                   # Root component with state management
├── main.tsx                  # Entry point
└── index.css                 # All styles
```

## Disclaimer

> Rates shown are illustrative and for comparison purposes only. Always consult a qualified mortgage adviser before making financial decisions.
