import { EventEmitter } from 'events';

// Global singleton so it persists across Next.js API requests in dev/prod (Node environment)
const globalForEvents = global as unknown as { eventBus: EventEmitter };

export const eventBus = globalForEvents.eventBus || new EventEmitter();

if (process.env.NODE_ENV !== 'production') globalForEvents.eventBus = eventBus;
