import { detectSeasonality } from './priceAnalytics';

export const predictWithMovingAverage = (prices: any[], days = 7, window = 14): any[] => {
  if (!prices || prices.length < window) {
    return [];
  }

  const sortedPrices = [...prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const recentPrices = sortedPrices.slice(-window);
  const priceValues = recentPrices.map((p) => p.price);
  const movingAvg = priceValues.reduce((a, b) => a + b, 0) / window;

  const predictions: any[] = [];
  const lastDate = new Date(sortedPrices[sortedPrices.length - 1].date);

  for (let i = 1; i <= days; i++) {
    const predictionDate = new Date(lastDate);
    predictionDate.setDate(predictionDate.getDate() + i);

    predictions.push({
      date: predictionDate,
      price: movingAvg,
      method: 'moving_average',
      confidence: 0.5,
    });
  }

  return predictions;
};

export const predictWithLinearRegression = (prices: any[], days = 7): any[] => {
  if (!prices || prices.length < 2) {
    return [];
  }

  const sortedPrices = [...prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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

  const predictions: any[] = [];
  const lastDate = new Date(sortedPrices[sortedPrices.length - 1].date);
  const lastIndex = x[x.length - 1];

  for (let i = 1; i <= days; i++) {
    const predictionDate = new Date(lastDate);
    predictionDate.setDate(predictionDate.getDate() + i);

    const predictedPrice = intercept + slope * (lastIndex + i);

    predictions.push({
      date: predictionDate,
      price: predictedPrice,
      method: 'linear_regression',
      confidence: rSquared,
    });
  }

  return predictions;
};

export const predictWithWeightedMovingAverage = (prices: any[], days = 7, window = 14): any[] => {
  if (!prices || prices.length < window) {
    return [];
  }

  const sortedPrices = [...prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const recentPrices = sortedPrices.slice(-window);

  let weightedSum = 0;
  let weightSum = 0;

  for (let i = 0; i < recentPrices.length; i++) {
    const weight = i + 1;
    weightedSum += recentPrices[i].price * weight;
    weightSum += weight;
  }

  const weightedAvg = weightedSum / weightSum;

  const predictions: any[] = [];
  const lastDate = new Date(sortedPrices[sortedPrices.length - 1].date);

  for (let i = 1; i <= days; i++) {
    const predictionDate = new Date(lastDate);
    predictionDate.setDate(predictionDate.getDate() + i);

    predictions.push({
      date: predictionDate,
      price: weightedAvg,
      method: 'weighted_moving_average',
      confidence: 0.6,
    });
  }

  return predictions;
};

export const predictWithExponentialSmoothing = (prices: any[], days = 7, alpha = 0.3): any[] => {
  if (!prices || prices.length < 2) {
    return [];
  }

  const sortedPrices = [...prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const priceValues = sortedPrices.map((p) => p.price);
  let smoothed = priceValues[0];

  for (let i = 1; i < priceValues.length; i++) {
    smoothed = alpha * priceValues[i] + (1 - alpha) * smoothed;
  }

  const predictions: any[] = [];
  const lastDate = new Date(sortedPrices[sortedPrices.length - 1].date);

  for (let i = 1; i <= days; i++) {
    const predictionDate = new Date(lastDate);
    predictionDate.setDate(predictionDate.getDate() + i);

    predictions.push({
      date: predictionDate,
      price: smoothed,
      method: 'exponential_smoothing',
      confidence: 0.65,
    });
  }

  return predictions;
};

export const predictWithEnsemble = (prices: any[], days = 7): any[] => {
  if (!prices || prices.length < 14) {
    return [];
  }

  const maPredict = predictWithMovingAverage(prices, days);
  const lrPredict = predictWithLinearRegression(prices, days);
  const wmaPredict = predictWithWeightedMovingAverage(prices, days);
  const esPredict = predictWithExponentialSmoothing(prices, days);

  const predictions: any[] = [];

  for (let i = 0; i < days; i++) {
    const date = maPredict[i].date;

    const totalConfidence =
      maPredict[i].confidence + lrPredict[i].confidence + wmaPredict[i].confidence + esPredict[i].confidence;

    const weightedPrice =
      (maPredict[i].price * maPredict[i].confidence +
        lrPredict[i].price * lrPredict[i].confidence +
        wmaPredict[i].price * wmaPredict[i].confidence +
        esPredict[i].price * esPredict[i].confidence) /
      totalConfidence;

    const confidence = Math.max(
      maPredict[i].confidence,
      lrPredict[i].confidence,
      wmaPredict[i].confidence,
      esPredict[i].confidence
    );

    predictions.push({
      date,
      price: weightedPrice,
      method: 'ensemble',
      confidence,
      components: {
        movingAverage: maPredict[i].price,
        linearRegression: lrPredict[i].price,
        weightedMovingAverage: wmaPredict[i].price,
        exponentialSmoothing: esPredict[i].price,
      },
    });
  }

  return predictions;
};

export const predictWithSeasonalAdjustment = (prices: any[], days = 7, seasonalPeriod = 7): any[] => {
  if (!prices || prices.length < seasonalPeriod * 2) {
    return [];
  }

  const sortedPrices = [...prices].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const seasonalIndices: number[] = [];

  for (let i = 0; i < seasonalPeriod; i++) {
    let sum = 0;
    let count = 0;

    for (let j = i; j < sortedPrices.length; j += seasonalPeriod) {
      if (j < sortedPrices.length) {
        sum += sortedPrices[j].price;
        count++;
      }
    }

    seasonalIndices.push(count > 0 ? sum / count : 1);
  }

  const avgIndex = seasonalIndices.reduce((a, b) => a + b, 0) / seasonalPeriod;
  const normalizedIndices = seasonalIndices.map((idx) => idx / avgIndex);

  const basePredict = predictWithLinearRegression(prices, days);

  const predictions: any[] = [];
  const lastDate = new Date(sortedPrices[sortedPrices.length - 1].date);
  const dayOfCycle = sortedPrices.length % seasonalPeriod;

  for (let i = 0; i < days; i++) {
    const predictionDate = new Date(lastDate);
    predictionDate.setDate(predictionDate.getDate() + i + 1);

    const seasonalIndex = normalizedIndices[(dayOfCycle + i) % seasonalPeriod];
    const adjustedPrice = basePredict[i].price * seasonalIndex;

    predictions.push({
      date: predictionDate,
      price: adjustedPrice,
      method: 'seasonal_adjustment',
      confidence: basePredict[i].confidence * 0.9,
      seasonalIndex,
    });
  }

  return predictions;
};

export const generatePriceForecast = (prices: any[], days = 30) => {
  if (!prices || prices.length < 30) {
    return {
      success: false,
      message: 'Insufficient historical data for accurate forecasting',
      minimumDataPoints: 30,
      actualDataPoints: prices ? prices.length : 0,
    };
  }

  const ensemblePrediction = predictWithEnsemble(prices, days);
  const seasonalPrediction = predictWithSeasonalAdjustment(prices, days);

  const seasonality = detectSeasonality(prices);

  const selectedPrediction =
    seasonality.hasSeasonality && seasonality.confidence > 0.6 ? seasonalPrediction : ensemblePrediction;

  const firstPrediction = selectedPrediction[0].price;
  const lastPrediction = selectedPrediction[selectedPrediction.length - 1].price;
  const predictedChange = ((lastPrediction - firstPrediction) / firstPrediction) * 100;

  let recommendation = '';
  if (predictedChange < -5) {
    recommendation = 'Consider delaying purchases as prices are expected to decrease significantly.';
  } else if (predictedChange < 0) {
    recommendation = 'Prices are expected to decrease slightly. Consider standard purchasing patterns.';
  } else if (predictedChange < 5) {
    recommendation = 'Prices are expected to increase slightly. Consider standard purchasing patterns.';
  } else {
    recommendation = 'Consider accelerating purchases as prices are expected to increase significantly.';
  }

  return {
    success: true,
    forecast: selectedPrediction,
    alternativeForecasts: {
      ensemble: ensemblePrediction,
      seasonal: seasonalPrediction,
    },
    trend: {
      direction: predictedChange > 0 ? 'increasing' : 'decreasing',
      percentChange: predictedChange,
      confidence: selectedPrediction[0].confidence,
    },
    seasonality,
    recommendation,
    forecastGeneratedAt: new Date(),
  };
};
