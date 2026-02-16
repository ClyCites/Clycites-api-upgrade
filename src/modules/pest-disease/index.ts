/**
 * Pest & Disease Module - Index
 * 
 * Central export point for the Pest & Disease Detection Module.
 */

// Models
export { default as PestDiseaseReport } from './pestDiseaseReport.model';
export { default as RegionalOutbreak } from './regionalOutbreak.model';
export { default as TreatmentKnowledgeBase } from './treatmentKnowledgeBase.model';

// Services
export { default as pestDiseaseService } from './pestDisease.service';
export { default as aiDetectionService } from './aiDetection.service';
export { default as imageStorageService } from './imageStorage.service';
export { default as outbreakAnalyticsService } from './outbreakAnalytics.service';

// Types
export * from './pestDisease.types';

// Routes
export { default as pestDiseaseRoutes } from './pestDisease.routes';

// Controllers (exported for potential direct use or testing)
export * as pestDiseaseController from './pestDisease.controller';
