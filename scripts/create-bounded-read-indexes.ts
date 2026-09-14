import { MongoClient } from 'mongodb';

import { BOUNDED_READ_INDEXES } from '../lib/bounded-read-indexes';

class MissingEnvironmentError extends Error {
  constructor(name: string) {
    super(`${name} is required with --apply`);
    this.name = 'MissingEnvironmentError';
  }
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  if (!apply) {
    process.stdout.write(
      `${JSON.stringify({ mode: 'dry-run', indexes: BOUNDED_READ_INDEXES }, null, 2)}\n`
    );
    return;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new MissingEnvironmentError('MONGODB_URI');
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('naraddon');
    for (const index of BOUNDED_READ_INDEXES) {
      await db.collection(index.collection).createIndex(index.keys, { name: index.name });
      process.stdout.write(`${index.collection}:${index.name}\n`);
    }
  } finally {
    await client.close();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'unknown error';
  process.stderr.write(`bounded index creation failed: ${message}\n`);
  process.exitCode = 1;
});
