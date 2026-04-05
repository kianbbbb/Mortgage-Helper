import type { RateData, MortgageProduct } from '../types/mortgage';

/** Fallback BoE base rate if live fetch fails */
const FALLBACK_BASE_RATE = 4.5;

/**
 * Fetches the current Bank of England base rate.
 * Tries the BoE Statistical Interactive Database API first,
 * then falls back to a hardcoded value.
 */
export async function fetchBaseRate(): Promise<RateData> {
  try {
    // Bank of England Statistical Interactive Database – CSV endpoint
    // Series IUDBEDR is the official Bank Rate
    const endDate = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toLocaleDateString(
      'en-GB',
      { day: '2-digit', month: 'short', year: 'numeric' },
    );

    const url =
      `https://www.bankofengland.co.uk/boeapps/database/_iadb-fromshowcolumns.asp` +
      `?Travel=NIxIRx&FromSeries=1&ToSeries=50&DASession=DA` +
      `&Session=DA012345&csv.x=1&SeriesCodes=IUDBEDR&UsingCodes=Y&CSVF=TN` +
      `&Datefrom=${encodeURIComponent(startDate)}&Dateto=${encodeURIComponent(endDate)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    const lines = text
      .trim()
      .split('\n')
      .filter((l) => l.trim().length > 0);

    // Parse CSV: header row + data rows; last row is most recent
    if (lines.length >= 2) {
      const lastLine = lines[lines.length - 1];
      const parts = lastLine.split(',');
      if (parts.length >= 2) {
        const rate = parseFloat(parts[1].trim());
        if (!isNaN(rate) && rate > 0 && rate < 30) {
          return {
            baseRate: rate,
            source: 'Bank of England',
            lastUpdated: new Date().toISOString(),
            isLive: true,
          };
        }
      }
    }

    throw new Error('Could not parse BoE response');
  } catch {
    // Fallback: return a static rate with clear indication
    return {
      baseRate: FALLBACK_BASE_RATE,
      source: 'Cached (Bank of England)',
      lastUpdated: '2025-02-06T00:00:00Z',
      isLive: false,
    };
  }
}

/**
 * Returns a copy of the product list with tracker rates dynamically
 * recalculated based on the current BoE base rate.
 */
export function applyLiveRates(
  products: MortgageProduct[],
  baseRate: number,
): MortgageProduct[] {
  return products.map((product) => {
    if (product.trackerMargin != null) {
      const newRate = parseFloat((baseRate + product.trackerMargin).toFixed(2));
      // Lifetime trackers (initialPeriodYears >= 999) track forever,
      // so their revert rate should also be updated to match.
      const newRevertRate =
        product.initialPeriodYears >= 999 ? newRate : product.revertRate;
      return { ...product, initialRate: newRate, revertRate: newRevertRate };
    }
    return product;
  });
}
