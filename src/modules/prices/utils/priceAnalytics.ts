export const calculateMovingAverage = (prices: any[], window = 7): any[] => {
  if (!prices || prices.length < window) {
    return [];
  }

  const sortedPrices = [...prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const movingAverages: any[] = [];

  for (let i = window - 1; i < sortedPrices.length; i++) {
    const windowPrices = sortedPrices.slice(i - window + 1, i + 1);
    const sum = windowPrices.reduce((acc: number, p: any) => acc + p.price, 0);
    const average = sum / window;

    movingAverages.push({
      date: sortedPrices[i].date,
      price: sortedPrices[i].price,
      movingAverage: average,
      windowSize: window,
    });
  }

  return movingAverages;
};

export const detectPriceTrend = (prices: any[], days = 30) => {
  if (!prices || prices.length < 2) {
    return { trend: 'insufficient_data', slope: 0, confidence: 0 };
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const filteredPrices = prices.filter((p) => new Date(p.date) >= cutoffDate);

  if (filteredPrices.length < 2) {
    return { trend: 'insufficient_data', slope: 0, confidence: 0 };
  }

  const sortedPrices = [...filteredPrices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const x = sortedPrices.map((_p, i) => i);
  const y = sortedPrices.map((p) => p.price);

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const yMean = sumY / n;
  const ssTotal = y.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);
  const ssResidual = y.reduce((acc, yi, i) => acc + Math.pow(yi - (intercept + slope * x[i]), 2), 0);
  const rSquared = 1 - ssResidual / ssTotal;

  let trend = 'stable';
  if (Math.abs(slope) < 0.001) {
    trend = 'stable';
  } else if (slope > 0) {
    trend = rSquared > 0.7 ? 'strongly_increasing' : 'increasing';
  } else {
    trend = rSquared > 0.7 ? 'strongly_decreasing' : 'decreasing';
  }

  return {
    trend,
    slope,
    intercept,
    rSquared,
    startDate: sortedPrices[0].date,
    endDate: sortedPrices[sortedPrices.length - 1].date,
    startPrice: sortedPrices[0].price,
    endPrice: sortedPrices[sortedPrices.length - 1].price,
    percentChange:
      ((sortedPrices[sortedPrices.length - 1].price - sortedPrices[0].price) / sortedPrices[0].price) * 100,
    confidence: rSquared,
  };
};

export const detectSeasonality = (prices: any[]) => {
  if (!prices || prices.length < 30) {
    return { hasSeasonality: false, confidence: 0, patterns: [] };
  }

  const sortedPrices = [...prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const weeklyPattern = checkPeriodicity(sortedPrices, 7);
  const monthlyPattern = checkPeriodicity(sortedPrices, 30);
  const quarterlyPattern = checkPeriodicity(sortedPrices, 90);

  const patterns = [
    { period: 'weekly', ...weeklyPattern },
    { period: 'monthly', ...monthlyPattern },
    { period: 'quarterly', ...quarterlyPattern },
  ].filter((p: any) => p.correlation > 0.5);

  patterns.sort((a: any, b: any) => b.correlation - a.correlation);

  return {
    hasSeasonality: patterns.length > 0,
    confidence: patterns.length > 0 ? patterns[0].correlation : 0,
    patterns,
  };
};

const checkPeriodicity = (prices: any[], period: number) => {
  if (prices.length < period * 2) {
    return { correlation: 0, significance: 0 };
  }

  const periods: any[] = [];
  for (let i = 0; i < Math.floor(prices.length / period); i++) {
    periods.push(prices.slice(i * period, (i + 1) * period));
  }

  let totalCorrelation = 0;
  let correlationCount = 0;

  for (let i = 0; i < periods.length - 1; i++) {
    const period1 = periods[i].map((p: any) => p.price);
    const period2 = periods[i + 1].map((p: any) => p.price);

    const correlation = calculateCorrelation(period1, period2);

    if (!Number.isNaN(correlation)) {
      totalCorrelation += correlation;
      correlationCount++;
    }
  }

  const avgCorrelation = correlationCount > 0 ? totalCorrelation / correlationCount : 0;

  return {
    correlation: avgCorrelation,
    significance: avgCorrelation > 0.7 ? 'high' : avgCorrelation > 0.5 ? 'medium' : 'low',
  };
};

const calculateCorrelation = (x: number[], y: number[]) => {
  if (x.length !== y.length || x.length === 0) {
    return Number.NaN;
  }

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * y[i], 0);
  const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);
  const sumYY = y.reduce((acc, yi) => acc + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));

  if (denominator === 0) {
    return 0;
  }

  return numerator / denominator;
};

export const calculateVolatility = (prices: any[], days = 30) => {
  if (!prices || prices.length < 2) {
    return { volatility: 0, averagePrice: 0, standardDeviation: 0 };
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const filteredPrices = prices.filter((p) => new Date(p.date) >= cutoffDate);

  if (filteredPrices.length < 2) {
    return { volatility: 0, averagePrice: 0, standardDeviation: 0 };
  }

  const priceValues = filteredPrices.map((p) => p.price);
  const averagePrice = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;

  const squaredDifferences = priceValues.map((p) => Math.pow(p - averagePrice, 2));
  const variance = squaredDifferences.reduce((a, b) => a + b, 0) / priceValues.length;
  const standardDeviation = Math.sqrt(variance);

  const volatility = standardDeviation / averagePrice;

  return {
    volatility,
    averagePrice,
    standardDeviation,
    interpretation: volatility < 0.05 ? 'low' : volatility < 0.15 ? 'medium' : 'high',
  };
};

export const identifyAnomalies = (prices: any[], threshold = 2.5) => {
  if (!prices || prices.length < 5) {
    return [];
  }

  const priceValues = prices.map((p) => p.price);
  const mean = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;

  const squaredDifferences = priceValues.map((p) => Math.pow(p - mean, 2));
  const variance = squaredDifferences.reduce((a, b) => a + b, 0) / priceValues.length;
  const stdDev = Math.sqrt(variance);

  const anomalies = prices.filter((p) => {
    const zScore = Math.abs((p.price - mean) / stdDev);
    return zScore > threshold;
  });

  return anomalies.map((p) => ({
    ...p,
    zScore: (p.price - mean) / stdDev,
    deviation: p.price - mean,
    percentDeviation: ((p.price - mean) / mean) * 100,
  }));
};

export const compareMarkets = (marketPrices: Record<string, number[]>) => {
  if (!marketPrices || Object.keys(marketPrices).length < 2) {
    return { differences: [], insights: [] };
  }

  const markets = Object.keys(marketPrices);
  const differences: any[] = [];

  for (let i = 0; i < markets.length; i++) {
    for (let j = i + 1; j < markets.length; j++) {
      const market1 = markets[i];
      const market2 = markets[j];

      const avgPrice1 = calculateAverage(marketPrices[market1]);
      const avgPrice2 = calculateAverage(marketPrices[market2]);

      const priceDiff = avgPrice1 - avgPrice2;
      const percentDiff = (priceDiff / Math.min(avgPrice1, avgPrice2)) * 100;

      differences.push({
        market1,
        market2,
        avgPrice1,
        avgPrice2,
        priceDiff,
        percentDiff: Math.abs(percentDiff),
        cheaperMarket: priceDiff > 0 ? market2 : market1,
      });
    }
  }

  differences.sort((a, b) => b.percentDiff - a.percentDiff);

  const insights: string[] = [];

  if (differences.length > 0) {
    const topDiff = differences[0];
    insights.push(
      `${topDiff.market1} is ${topDiff.percentDiff.toFixed(2)}% ${topDiff.priceDiff > 0 ? 'more expensive' : 'cheaper'} than ${topDiff.market2}.`
    );

    if (topDiff.percentDiff > 10) {
      insights.push(
        `There's a significant price difference between ${topDiff.market1} and ${topDiff.market2}, which may present arbitrage opportunities.`
      );
    }
  }

  return { differences, insights };
};

const calculateAverage = (arr: number[]) => {
  if (!arr || arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
};

export const analyzeProductCorrelations = (productPrices: Record<string, any[]>) => {
  const products = Object.keys(productPrices);

  if (products.length < 2) {
    return { correlations: {}, insights: [] };
  }

  const correlations: Record<string, Record<string, number>> = {};

  for (let i = 0; i < products.length; i++) {
    correlations[products[i]] = {};

    for (let j = 0; j < products.length; j++) {
      if (i === j) {
        correlations[products[i]][products[j]] = 1;
      } else if (j > i) {
        const prices1 = productPrices[products[i]].map((p) => p.price);
        const prices2 = productPrices[products[j]].map((p) => p.price);

        const correlation = calculateCorrelation(prices1, prices2);
        correlations[products[i]][products[j]] = correlation;
        correlations[products[j]][products[i]] = correlation;
      }
    }
  }

  const highlyCorrelated: any[] = [];
  const inverselyCorrelated: any[] = [];

  for (let i = 0; i < products.length; i++) {
    for (let j = i + 1; j < products.length; j++) {
      const correlation = correlations[products[i]][products[j]];

      if (correlation > 0.7) {
        highlyCorrelated.push({
          product1: products[i],
          product2: products[j],
          correlation,
        });
      } else if (correlation < -0.7) {
        inverselyCorrelated.push({
          product1: products[i],
          product2: products[j],
          correlation,
        });
      }
    }
  }

  const insights: string[] = [];

  if (highlyCorrelated.length > 0) {
    const top = highlyCorrelated[0];
    insights.push(`Strong positive correlation between ${top.product1} and ${top.product2} (${top.correlation.toFixed(2)}).`);
  }

  if (inverselyCorrelated.length > 0) {
    const top = inverselyCorrelated[0];
    insights.push(`Strong negative correlation between ${top.product1} and ${top.product2} (${top.correlation.toFixed(2)}).`);
  }

  return { correlations, highlyCorrelated, inverselyCorrelated, insights };
};
