import { createStarterApp } from './app.js';
import { database, stripe } from './app-context.js';

// Search and subscription providers disabled - not included in this build
const search = undefined;
const subscriptionProvider = undefined;

console.log('TillKit starter (serverless) initializing...');
console.log(`PocketBase: ${process.env.POCKETBASE_URL || 'not configured'}`);
console.log(`Stripe: ${stripe ? 'configured' : 'not configured'}`);

const app = createStarterApp({ database, stripe, search, subscriptionProvider });

export { app };
