require('dotenv').config();
const path = require('path');
const cors = require('cors');
const corsOptions = require('./middleware/corsConfig');
const express = require('express');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const session = require('express-session'); // Import express-session
const errorLogger = require('./middleware/errorLogger');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const mockupRoutes = require('./routes/mockups');
const projectRoutes = require('./routes/projects');

const app = express();
const port = process.env.PORT || 3001;

// Apply CORS, JSON body parsing, and cookie parsing
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// Your middleware to log headers
app.use((req, res, next) => {
  //console.log(req.headers); // This will log all headers to see if Authorization is present
  next();
});

// Session setup
app.use(session({
  secret: process.env.SESSION_SECRET, // Use the SESSION_SECRET from your .env file
  resave: false,
  saveUninitialized: false, // Change to true if you want to save session on each request
  cookie: { secure: process.env.NODE_ENV === 'production', httpOnly: true } // Secure in production
}));

// Define rate limiting rule
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/mockups', mockupRoutes);
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(errorLogger); // Use the error logging middleware

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});