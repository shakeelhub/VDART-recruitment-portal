import express from 'express';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import { setupMiddleware } from './middleware/index.js';
import routes from './routes/index.js';
import path from 'path';

// Load .env file
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT) || 3000;

// Setup middleware
setupMiddleware(app);

app.use('/images', express.static(path.join(process.cwd(), 'images')));

// Setup routes
app.use('/', routes);

// Start everything
const start = async () => {
  try {
    console.log('🔄 Starting VDart Portal Server...');
    
    await connectDB();
    
    const server = app.listen(PORT, '192.168.6.185', () => {
      console.log(`✅ Server successfully running on http://localhost:${PORT}`);
      console.log(`🌐 Also accessible at: http://192.168.6.185:${PORT}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

start();