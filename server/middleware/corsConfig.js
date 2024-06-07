require('dotenv').config();

const corsOptions = {
  origin: process.env.CORS_ORIGIN,
  credentials: true,
};

module.exports = corsOptions;