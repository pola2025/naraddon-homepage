import { MongoClient } from 'mongodb';

// MongoDB URI 체크 및 Vercel 환경 최적화
let uri = process.env.MONGODB_URI;

// Vercel 프로덕션 환경에서 추가 파라미터 적용
if (uri && process.env.VERCEL) {
  // URI에 이미 파라미터가 있는지 확인
  const separator = uri.includes('?') ? '&' : '?';
  // Vercel 환경에 최적화된 파라미터 추가
  uri = `${uri}${separator}retryWrites=true&w=majority&maxPoolSize=10&serverSelectionTimeoutMS=30000`;
  console.log('MongoDB URI optimized for Vercel environment');
}

let clientPromise: Promise<MongoClient | any>;

// MongoDB가 설정되지 않았을 때 더미 클라이언트 반환
if (!uri) {
  console.warn('MONGODB_URI not set, using dummy client');
  console.warn('Environment:', process.env.NODE_ENV);
  console.warn('Vercel:', process.env.VERCEL ? 'Yes' : 'No');

  const dummyClient = {
    connect: () => Promise.resolve(null),
    db: () => ({
      collection: () => ({
        findOne: () => Promise.resolve(null),
        find: () => ({ toArray: () => Promise.resolve([]) }),
        insertOne: () => Promise.resolve({ insertedId: 'dummy-' + Date.now() }),
        updateOne: () => Promise.resolve({ modifiedCount: 0 }),
        deleteOne: () => Promise.resolve({ deletedCount: 0 }),
        findOneAndUpdate: () => Promise.resolve({ value: null }),
        deleteMany: () => Promise.resolve({ deletedCount: 0 }),
      })
    })
  };
  clientPromise = Promise.resolve(dummyClient);
} else {
  console.log('MongoDB URI is set, attempting connection...');
  // 정상적인 MongoDB 클라이언트 설정 - Vercel 환경 최적화
  const options = {
    maxPoolSize: 10,
    minPoolSize: 2,
    maxIdleTimeMS: 10000,
    serverSelectionTimeoutMS: 30000, // 30초로 증가 (Vercel 환경)
    socketTimeoutMS: 45000, // 45초로 증가
    connectTimeoutMS: 30000, // 30초로 증가
    retryWrites: true,
    w: 'majority'
  };
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

    // 연결 재시도 로직 추가
    const connectWithRetry = async (retries = 3): Promise<MongoClient | any> => {
      for (let i = 0; i < retries; i++) {
        try {
          console.log(`MongoDB connection attempt ${i + 1}/${retries}...`);
          const connectedClient = await client.connect();
          console.log('MongoDB connection successful!');
          return connectedClient;
        } catch (error: any) {
          console.error(`MongoDB connection attempt ${i + 1} failed:`, error.message);

          if (i === retries - 1) {
            console.error('All MongoDB connection attempts failed');
            console.error('Connection string starts with:', uri.substring(0, 20) + '...');

            // 모든 재시도 실패 시 더미 클라이언트 반환
            return {
              connect: () => Promise.resolve(null),
              db: () => ({
                collection: () => ({
                  findOne: () => Promise.resolve(null),
                  find: () => ({ toArray: () => Promise.resolve([]) }),
                  insertOne: () => Promise.resolve({ insertedId: 'fallback-' + Date.now() }),
                  updateOne: () => Promise.resolve({ modifiedCount: 0 }),
                  deleteOne: () => Promise.resolve({ deletedCount: 0 }),
                  findOneAndUpdate: () => Promise.resolve({ value: null }),
                  deleteMany: () => Promise.resolve({ deletedCount: 0 }),
                })
              })
            };
          }

          // 재시도 간 대기 (지수 백오프)
          const delay = Math.min(1000 * Math.pow(2, i), 10000);
          console.log(`Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    };

    clientPromise = connectWithRetry();
  }
}

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;