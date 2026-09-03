// Cloud Functions skeleton (Phase 2). Nothing here is deployed or called
// yet — Phase 1 runs entirely in local_test mode. See ../README section
// "Phase 2: wiring up Firebase" for how to build/deploy this once ready.
export { logRawEvent } from './logRawEvent.js'
export { qualifyEvents } from './qualifyEvents.js'
export { evaluateOutboundClickServer } from './fraudScoring.js'
export { syncPublicCreative } from './syncPublicCreative.js'
export { addPromoGame } from './promoAdmin.js'
export { trackPromoEngagementSpend } from './promoSpendTracker.js'
