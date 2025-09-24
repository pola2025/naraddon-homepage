import { MongoClient } from 'mongodb';

// MongoDB URI 체크
const uri = process.env.MONGODB_URI;

let clientPromise: Promise<MongoClient | any>;

// MongoDB가 설정되지 않았을 때 더미 클라이언트 반환
if (!uri) {
  console.warn('MONGODB_URI not set, using dummy client');
  const dummyClient = {
    connect: () => Promise.resolve(null),
    db: () => ({
      collection: () => ({
        findOne: () => Promise.resolve(null),
        find: () => ({ toArray: () => Promise.resolve([]) }),
        insertOne: () => Promise.resolve({ insertedId: null }),
        updateOne: () => Promise.resolve({ modifiedCount: 0 }),
        deleteOne: () => Promise.resolve({ deletedCount: 0 }),
        findOneAndUpdate: () => Promise.resolve({ value: null }),
        deleteMany: () => Promise.resolve({ deletedCount: 0 }),
      })
    })
  };
  clientPromise = Promise.resolve(dummyClient);
} else {
  // 정상적인 MongoDB 클라이언트 설정
  const options = {};
  let client;

  if (process.env.NODE_ENV === 'development') {
    // In development mode, use a global variable so that the value
    // is preserved across module reloads caused by HMR (Hot Module Replacement).
    const globalWithMongo = global as typeof globalThis & {
      _mongoClientPromise?: Promise<MongoClient>;
    };

    if (!globalWithMongo._mongoClientPromise) {
      client = new MongoClient(uri, options);
      globalWithMongo._mongoClientPromise = client.connect();
    }
    clientPromise = globalWithMongo._mongoClientPromise;
  } else {
    // In production mode, it's best to not use a global variable.
    client = new MongoClient(uri, options);
    clientPromise = client.connect();
  }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;