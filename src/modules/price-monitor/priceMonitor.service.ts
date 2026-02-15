import axios from 'axios';
import config from '../../common/config';
import { BadRequestError } from '../../common/errors/AppError';

interface PredictPayload {
  feature_1: number;
  feature_2: number;
}

class PriceMonitorService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.priceMonitor.serviceUrl;
  }

  async predictPrice(payload: PredictPayload) {
    try {
      const response = await axios.post(`${this.baseUrl}/api/predict`, payload, {
        timeout: 10000,
      });

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.message || 'Price prediction failed';
        throw new BadRequestError(message, error.response?.data);
      }

      throw new BadRequestError('Price prediction failed');
    }
  }

  async trainModel() {
    try {
      const response = await axios.post(`${this.baseUrl}/api/train`, null, {
        timeout: 30000,
      });

      return response.data;
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.error || 'Model training failed';
        throw new BadRequestError(message, error.response?.data);
      }

      throw new BadRequestError('Model training failed');
    }
  }
}

export default PriceMonitorService;
