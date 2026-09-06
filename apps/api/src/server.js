import app from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.PORT || 5050;

const startServer = async () => {
  await connectDB();
  app.listen(PORT, () => {
    console.log(`[API Server] Running on http://localhost:${PORT}`);
  });
};

startServer().catch((err) => {
  console.error('[API Server Startup Error]', err);
  process.exit(1);
});
