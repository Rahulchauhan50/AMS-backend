import mongoose from 'mongoose';
import { env } from './env';

const MAX_RETRIES = 5;
const RETRY_INTERVAL = 5000; // 5 seconds

export const connectDB = async () => {
  let retries = 0;

  const attemptConnection = async () => {
    try {
      await mongoose.connect(env.MONGODB_URI);
      console.log('✅ MongoDB connected successfully');
    } catch (error) {
      console.error('❌ MongoDB connection error:', error);
      
      if (retries < MAX_RETRIES) {
        retries++;
        console.log(`🔄 Retrying connection (${retries}/${MAX_RETRIES}) in ${RETRY_INTERVAL / 1000}s...`);
        setTimeout(attemptConnection, RETRY_INTERVAL);
      } else {
        console.error('❌ Max connection retries reached. Exiting...');
        process.exit(1);
      }
    }
  };

  await attemptConnection();
};

// Monitor connection events
mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB event error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});
