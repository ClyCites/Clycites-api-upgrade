/**
 * AI Detection Service
 * 
 * Pluggable AI/ML service for pest and disease detection from crop images.
 * Supports multiple inference engines and provides a consistent interface
 * for image classification, confidence scoring, and result processing.
 */

import FormData from 'form-data';
import axios from 'axios';
import {
  IDetectionResult,
  IAlternativePrediction,
  IModelMetadata,
  DetectionType,
  SeverityLevel,
  ConfidenceLevel,
  IImageMetadata
} from './pestDisease.types';
import logger from '../../common/utils/logger';
import { AppError } from '../../common/errors/AppError';

// ============================================================================
// CONFIGURATION
// ============================================================================

interface AIConfig {
  provider: 'plantvillage' | 'custom' | 'tensorflow' | 'pytorch' | 'mock';
  apiEndpoint?: string;
  apiKey?: string;
  modelName: string;
  modelVersion: string;
  inferenceEngine: string;
  confidenceThreshold: number;
  maxAlternatives: number;
  timeout: number;
}

const defaultConfig: AIConfig = {
  provider: process.env.AI_DETECTION_PROVIDER as AIConfig['provider'] || 'mock',
  apiEndpoint: process.env.AI_DETECTION_API_ENDPOINT,
  apiKey: process.env.AI_DETECTION_API_KEY,
  modelName: process.env.AI_MODEL_NAME || 'PlantDisease-ResNet50',
  modelVersion: process.env.AI_MODEL_VERSION || 'v1.0.0',
  inferenceEngine: process.env.AI_INFERENCE_ENGINE || 'TensorFlow',
  confidenceThreshold: Number(process.env.AI_CONFIDENCE_THRESHOLD) || 60,
  maxAlternatives: Number(process.env.AI_MAX_ALTERNATIVES) || 3,
  timeout: Number(process.env.AI_REQUEST_TIMEOUT) || 30000
};

// ============================================================================
// MOCK DATA (for testing/development)
// ============================================================================

const MOCK_DETECTIONS = [
  {
    entity: 'Fall Armyworm',
    type: DetectionType.PEST,
    scientificName: 'Spodoptera frugiperda',
    commonNames: ['fall armyworm', 'maize caterpillar'],
    confidence: 92.5,
    severity: SeverityLevel.HIGH
  },
  {
    entity: 'Late Blight',
    type: DetectionType.DISEASE,
    scientificName: 'Phytophthora infestans',
    commonNames: ['late blight', 'potato blight'],
    confidence: 88.3,
    severity: SeverityLevel.SEVERE
  },
  {
    entity: 'Maize Leaf Rust',
    type: DetectionType.DISEASE,
    scientificName: 'Puccinia sorghi',
    commonNames: ['common rust', 'leaf rust'],
    confidence: 85.7,
    severity: SeverityLevel.MODERATE
  },
  {
    entity: 'Nitrogen Deficiency',
    type: DetectionType.NUTRIENT_DEFICIENCY,
    scientificName: null,
    commonNames: ['nitrogen deficiency', 'n deficiency'],
    confidence: 78.2,
    severity: SeverityLevel.MODERATE
  },
  {
    entity: 'Aphids',
    type: DetectionType.PEST,
    scientificName: 'Aphidoidea',
    commonNames: ['aphids', 'plant lice'],
    confidence: 94.1,
    severity: SeverityLevel.LOW
  }
];

// ============================================================================
// AI DETECTION SERVICE
// ============================================================================

class AIDetectionService {
  private config: AIConfig;

  constructor(config?: Partial<AIConfig>) {
    this.config = { ...defaultConfig, ...config };
  }

  /**
   * Classify image and detect pests/diseases
   */
  async detectFromImage(
    imageMetadata: IImageMetadata,
    context?: {
      cropType?: string;
      location?: [number, number];
      season?: string;
    }
  ): Promise<{
    primaryResult: IDetectionResult;
    alternativePredictions: IAlternativePrediction[];
    modelMetadata: IModelMetadata;
    processingTime: number;
  }> {
    const startTime = Date.now();

    try {
      logger.info('Starting AI detection', {
        imageUrl: imageMetadata.url,
        provider: this.config.provider,
        context
      });

      let result;

      switch (this.config.provider) {
        case 'mock':
          result = await this.mockDetection(imageMetadata, context);
          break;

        case 'plantvillage':
          result = await this.plantVillageDetection(imageMetadata, context);
          break;

        case 'custom':
          result = await this.customAPIDetection(imageMetadata, context);
          break;

        default:
          throw new AppError(
            `Unsupported AI provider: ${this.config.provider}`,
            500,
            'AI_PROVIDER_ERROR'
          );
      }

      const processingTime = Date.now() - startTime;

      logger.info('AI detection completed', {
        detectedEntity: result.primaryResult.detectedEntity,
        confidence: result.primaryResult.confidenceScore,
        processingTime
      });

      return {
        ...result,
        processingTime
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      logger.error('AI detection failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime
      });

      throw new AppError(
        'AI detection failed. Please try again.',
        500,
        'AI_DETECTION_FAILED',
        true,
        { originalError: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }

  /**
   * Mock detection (for testing/development)
   */
  private async mockDetection(
    _imageMetadata: IImageMetadata,
    _context?: { cropType?: string }
  ): Promise<{
    primaryResult: IDetectionResult;
    alternativePredictions: IAlternativePrediction[];
    modelMetadata: IModelMetadata;
  }> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Random selection from mock data
    const mockData = MOCK_DETECTIONS[Math.floor(Math.random() * MOCK_DETECTIONS.length)];

    // Generate bounding boxes (mock)
    const boundingBoxes = [{
      x: 100 + Math.random() * 200,
      y: 100 + Math.random() * 200,
      width: 150 + Math.random() * 100,
      height: 150 + Math.random() * 100,
      confidence: mockData.confidence
    }];

    const primaryResult: IDetectionResult = {
      detectedEntity: mockData.entity,
      detectionType: mockData.type,
      scientificName: mockData.scientificName || undefined,
      commonNames: mockData.commonNames,
      confidenceScore: mockData.confidence,
      confidenceLevel: this.getConfidenceLevel(mockData.confidence),
      severityLevel: mockData.severity,
      affectedArea: 15 + Math.random() * 40,
      boundingBoxes
    };

    // Generate alternative predictions
    const alternatives: IAlternativePrediction[] = MOCK_DETECTIONS
      .filter(d => d.entity !== mockData.entity)
      .slice(0, this.config.maxAlternatives)
      .map((d, index) => ({
        entity: d.entity,
        detectionType: d.type,
        confidenceScore: mockData.confidence - (10 + index * 5),
        rank: index + 2
      }));

    const modelMetadata: IModelMetadata = {
      modelName: this.config.modelName,
      modelVersion: this.config.modelVersion,
      inferenceEngine: this.config.inferenceEngine,
      inferenceTime: 500 + Math.random() * 1000,
      modelAccuracy: 89.5,
      trainingDataset: 'PlantVillage-Extended-2024',
      deployedAt: new Date('2024-01-15')
    };

    return {
      primaryResult,
      alternativePredictions: alternatives,
      modelMetadata
    };
  }

  /**
   * PlantVillage API detection (example integration)
   */
  private async plantVillageDetection(
    imageMetadata: IImageMetadata,
    context?: { cropType?: string }
  ): Promise<{
    primaryResult: IDetectionResult;
    alternativePredictions: IAlternativePrediction[];
    modelMetadata: IModelMetadata;
  }> {
    if (!this.config.apiEndpoint || !this.config.apiKey) {
      throw new AppError(
        'PlantVillage API endpoint or key not configured',
        500,
        'API_CONFIG_ERROR'
      );
    }

    try {
      const formData = new FormData();
      formData.append('image_url', imageMetadata.url);
      if (context?.cropType) {
        formData.append('crop_type', context.cropType);
      }

      const response = await axios.post(
        this.config.apiEndpoint,
        formData,
        {
          headers: {
            ...formData.getHeaders(),
            'Authorization': `Bearer ${this.config.apiKey}`,
            'X-Model-Version': this.config.modelVersion
          },
          timeout: this.config.timeout
        }
      );

      return this.parseAPIResponse(response.data);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new AppError(
          `PlantVillage API error: ${error.message}`,
          error.response?.status || 500,
          'PLANTVILLAGE_API_ERROR'
        );
      }
      throw error;
    }
  }

  /**
   * Custom API detection (generic HTTP endpoint)
   */
  private async customAPIDetection(
    imageMetadata: IImageMetadata,
    context?: { cropType?: string; location?: [number, number]; season?: string }
  ): Promise<{
    primaryResult: IDetectionResult;
    alternativePredictions: IAlternativePrediction[];
    modelMetadata: IModelMetadata;
  }> {
    if (!this.config.apiEndpoint) {
      throw new AppError(
        'Custom API endpoint not configured',
        500,
        'API_CONFIG_ERROR'
      );
    }

    try {
      const payload = {
        image_url: imageMetadata.url,
        image_metadata: {
          width: imageMetadata.dimensions.width,
          height: imageMetadata.dimensions.height,
          source: imageMetadata.source
        },
        context: context || {},
        model_version: this.config.modelVersion
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const response = await axios.post(
        this.config.apiEndpoint,
        payload,
        { headers, timeout: this.config.timeout }
      );

      return this.parseAPIResponse(response.data);

    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new AppError(
          `Custom API error: ${error.message}`,
          error.response?.status || 500,
          'CUSTOM_API_ERROR'
        );
      }
      throw error;
    }
  }

  /**
   * Parse API response into standardized format
   */
  private parseAPIResponse(data: Record<string, unknown>): {
    primaryResult: IDetectionResult;
    alternativePredictions: IAlternativePrediction[];
    modelMetadata: IModelMetadata;
  } {
    // This is a generic parser - adapt based on your API's response format
    const prediction = data.prediction as Record<string, unknown>;
    const alternatives = (data.alternatives as Array<Record<string, unknown>>) || [];
    const model = data.model as Record<string, unknown>;

    const primaryResult: IDetectionResult = {
      detectedEntity: String(prediction.entity || prediction.class || 'Unknown'),
      detectionType: this.mapDetectionType(String(prediction.type || prediction.category)),
      scientificName: prediction.scientific_name ? String(prediction.scientific_name) : undefined,
      commonNames: Array.isArray(prediction.common_names) 
        ? prediction.common_names.map(String) 
        : [],
      confidenceScore: Number(prediction.confidence || 0),
      confidenceLevel: this.getConfidenceLevel(Number(prediction.confidence || 0)),
      severityLevel: this.mapSeverityLevel(String(prediction.severity || 'moderate')),
      affectedArea: prediction.affected_area ? Number(prediction.affected_area) : undefined,
      boundingBoxes: Array.isArray(prediction.bounding_boxes) 
        ? prediction.bounding_boxes.map((bbox: unknown) => {
            const box = bbox as Record<string, unknown>;
            return {
              x: Number(box.x || 0),
              y: Number(box.y || 0),
              width: Number(box.width || 0),
              height: Number(box.height || 0),
              confidence: Number(box.confidence || 0)
            };
          })
        : undefined
    };

    const alternativePredictions: IAlternativePrediction[] = alternatives.map((alt, index) => ({
      entity: String(alt.entity || alt.class || 'Unknown'),
      detectionType: this.mapDetectionType(String(alt.type || alt.category)),
      confidenceScore: Number(alt.confidence || 0),
      rank: index + 2
    }));

    const modelMetadata: IModelMetadata = {
      modelName: String(model?.name || this.config.modelName),
      modelVersion: String(model?.version || this.config.modelVersion),
      inferenceEngine: String(model?.engine || this.config.inferenceEngine),
      inferenceTime: Number(model?.inference_time || 0),
      modelAccuracy: model?.accuracy ? Number(model.accuracy) : undefined,
      trainingDataset: model?.training_dataset ? String(model.training_dataset) : undefined,
      deployedAt: model?.deployed_at ? new Date(String(model.deployed_at)) : new Date()
    };

    return {
      primaryResult,
      alternativePredictions,
      modelMetadata
    };
  }

  /**
   * Map string to DetectionType enum
   */
  private mapDetectionType(type: string): DetectionType {
    const normalized = type.toLowerCase();
    
    if (normalized.includes('pest') || normalized.includes('insect')) {
      return DetectionType.PEST;
    }
    if (normalized.includes('disease') || normalized.includes('pathogen')) {
      return DetectionType.DISEASE;
    }
    if (normalized.includes('nutrient') || normalized.includes('deficiency')) {
      return DetectionType.NUTRIENT_DEFICIENCY;
    }
    if (normalized.includes('stress') || normalized.includes('environmental')) {
      return DetectionType.ENVIRONMENTAL_STRESS;
    }
    if (normalized.includes('healthy')) {
      return DetectionType.HEALTHY;
    }
    
    return DetectionType.UNKNOWN;
  }

  /**
   * Map string to SeverityLevel enum
   */
  private mapSeverityLevel(severity: string): SeverityLevel {
    const normalized = severity.toLowerCase();
    
    if (normalized.includes('critical')) return SeverityLevel.CRITICAL;
    if (normalized.includes('severe')) return SeverityLevel.SEVERE;
    if (normalized.includes('high')) return SeverityLevel.HIGH;
    if (normalized.includes('moderate') || normalized.includes('medium')) return SeverityLevel.MODERATE;
    if (normalized.includes('low') || normalized.includes('minor')) return SeverityLevel.LOW;
    if (normalized.includes('none')) return SeverityLevel.NONE;
    
    return SeverityLevel.MODERATE;
  }

  /**
   * Determine confidence level from score
   */
  private getConfidenceLevel(score: number): ConfidenceLevel {
    if (score >= 90) return ConfidenceLevel.VERY_HIGH;
    if (score >= 75) return ConfidenceLevel.HIGH;
    if (score >= 60) return ConfidenceLevel.MEDIUM;
    if (score >= 40) return ConfidenceLevel.LOW;
    return ConfidenceLevel.VERY_LOW;
  }

  /**
   * Check if detection requires human review
   */
  requiresReview(result: IDetectionResult): boolean {
    // Review if confidence is low
    if (result.confidenceScore < this.config.confidenceThreshold) {
      return true;
    }

    // Review if severity is high
    if ([SeverityLevel.SEVERE, SeverityLevel.CRITICAL].includes(result.severityLevel)) {
      return true;
    }

    // Review if detection type is unknown
    if (result.detectionType === DetectionType.UNKNOWN) {
      return true;
    }

    return false;
  }

  /**
   * Update model configuration
   */
  updateConfig(config: Partial<AIConfig>): void {
    this.config = { ...this.config, ...config };
    
    logger.info('AI detection config updated', {
      provider: this.config.provider,
      modelName: this.config.modelName,
      modelVersion: this.config.modelVersion
    });
  }

  /**
   * Get current configuration
   */
  getConfig(): AIConfig {
    return { ...this.config };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export default new AIDetectionService();
export { AIDetectionService, AIConfig };
