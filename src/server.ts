import app from './app';
import { env } from './config/env';
import { connectDB } from './config/database';

const startServer = async () => {
  try {
    // Connect to Database
    await connectDB();

    app.listen(env.PORT, () => {
      console.log(`🚀 Server started on port ${env.PORT} in ${env.NODE_ENV} mode.`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
