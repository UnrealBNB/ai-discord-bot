export { processMessage, shouldProcessMessage, type PipelineResult } from './pipeline.js';
export { selectSituation, getImageAttachments, type SituationContext } from './situationSelector.js';
export { isMessageProcessed, markMessageProcessed, clearCache, getCacheSize } from './dedupeCache.js';
