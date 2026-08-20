import { generateFlightDossier } from './src/lib/pdf-service';

async function main() {
  try {
    // Just pass the known flight id from the user's screenshot URL, or we can fetch a flight
    const flightId = '9d576d01-e23e-4b68-ab62-2f3b392e6fca'; // from the earlier node command
    await generateFlightDossier(flightId);
    console.log('PDF generated successfully');
  } catch (err: unknown) {
    const e = err instanceof Error ? err : new Error(String(err));
    console.error('PDF Error:', e.message, e.stack);
  }
}

main().catch(console.error);
