const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
      connectSrc: ["'self'", process.env.FRONTEND_URL || "http://localhost:3000"],
      imgSrc: ["'self'", "data:", "https:"]
    }
  }
}));

app.use(compression());

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000,
  message: {
    status: 'error',
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// CORS Configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || ["http://localhost:3000", "http://127.0.0.1:3000"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Middleware
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// Database configuration - FIXED for XAMPP MySQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'winxapi_db',
  connectionLimit: 10,
  charset: 'utf8mb4',
  // Remove SSL for XAMPP MySQL
  ssl: false,
  // Additional options for better compatibility
  timezone: 'local',
  dateStrings: true,
  supportBigNumbers: true,
  bigNumberStrings: true
};

const pool = mysql.createPool(dbConfig);

// Test database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.log('❌ Database connection error:', err.message);
    console.log('💡 Make sure:');
    console.log('   1. XAMPP MySQL is running');
    console.log('   2. Database credentials in .env are correct');
    console.log('   3. MySQL port (usually 3306) is accessible');
  } else {
    console.log('✅ Database connected successfully');
    connection.release();
  }
});

// Database initialization
async function initializeDatabase() {
  try {
    const connection = await pool.promise().getConnection();
    
    // Create database if it doesn't exist
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || 'winxapi_db'}`);
    await connection.query(`USE ${process.env.DB_NAME || 'winxapi_db'}`);
    
    // Create users table
    const createTableSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      userID INT UNIQUE,
      currenciesPoliciesID INT,
      genericPoliciesID INT,
      openDate DATETIME,
      createdBy INT,
      country VARCHAR(100),
      termsAcceptedDate DATETIME,
      ignoreLiquidation BOOLEAN DEFAULT FALSE,
      accountID INT,
      closeOnly BOOLEAN DEFAULT FALSE,
      openOnly BOOLEAN DEFAULT FALSE,
      firstName VARCHAR(100),
      lastName VARCHAR(100),
      username VARCHAR(50),
      userType INT DEFAULT 1,
      tradingType INT DEFAULT 1,
      blockFrequentTradesSeconds INT DEFAULT 0,
      validateMoneyBeforeEntry BOOLEAN DEFAULT TRUE,
      validateMoneyBeforeClose BOOLEAN DEFAULT TRUE,
      chargeMarginForEntry BOOLEAN DEFAULT FALSE,
      clientPriceExecution BOOLEAN DEFAULT FALSE,
      percentageLevel1 DECIMAL(10,2) DEFAULT 0.00,
      percentageLevel2 DECIMAL(10,2) DEFAULT 0.00,
      percentageLevel3 DECIMAL(10,2) DEFAULT 0.00,
      percentageLevel4 DECIMAL(10,2) DEFAULT 0.00,
      creditLoanPercentage DECIMAL(10,2) DEFAULT 0.00,
      parentId INT,
      enableCashDelivery BOOLEAN DEFAULT FALSE,
      enableDepositRequest BOOLEAN DEFAULT FALSE,
      accountType INT DEFAULT 1,
      canCreateOrUpdateEntryOrder BOOLEAN DEFAULT TRUE,
      canCreateOrUpdateSltpOrder BOOLEAN DEFAULT TRUE,
      twoFactorAuthenticationEnabled BOOLEAN DEFAULT FALSE,
      emailVerified BOOLEAN DEFAULT FALSE,
      canTransferMoney BOOLEAN DEFAULT FALSE,
      ignoreBlockTradeIfInLoss BOOLEAN DEFAULT FALSE,
      canTransferPosition BOOLEAN DEFAULT FALSE,
      accountNonLocked BOOLEAN DEFAULT TRUE,
      enableApi BOOLEAN DEFAULT FALSE,
      userCurrencyId INT DEFAULT 1,
      locked BOOLEAN DEFAULT FALSE,
      isDemo BOOLEAN DEFAULT FALSE,
      liquidated BOOLEAN DEFAULT FALSE,
      allowMultiSession BOOLEAN DEFAULT TRUE,
      termsAccepted BOOLEAN DEFAULT FALSE,
      full_data JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_userID (userID),
      INDEX idx_country (country),
      INDEX idx_openDate (openDate)
    )`;
    
    await connection.query(createTableSQL);
    console.log('✅ Database initialized successfully');
    
    connection.release();
  } catch (error) {
    console.error('❌ Database initialization error:', error.message);
  }
}

// Initialize database on startup
initializeDatabase();

// Utility functions
async function userExists(userID) {
  try {
    const [rows] = await pool.promise().query('SELECT userID FROM users WHERE userID = ?', [userID]);
    return rows.length > 0;
  } catch (error) {
    console.error('Error checking user existence:', error);
    return false;
  }
}

async function updateUser(user) {
  try {
    const sql = `UPDATE users SET 
      firstName = ?, lastName = ?, username = ?, country = ?, 
      openDate = ?, accountID = ?, userType = ?, parentId = ?, 
      emailVerified = ?, full_data = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE userID = ?`;
    
    const values = [
      user.firstName || '',
      user.lastName || '',
      user.username || '',
      user.country || '',
      user.openDate || null,
      user.accountID || null,
      user.userType || 1,
      user.parentId || null,
      user.emailVerified || false,
      JSON.stringify(user),
      user.userID
    ];

    const [result] = await pool.promise().query(sql, values);
    return result.affectedRows > 0;
  } catch (error) {
    console.error(`❌ Error updating user ${user.userID}:`, error.message);
    return false;
  }
}

async function insertUser(user) {
  try {
    const sql = `INSERT INTO users 
      (userID, firstName, lastName, username, country, openDate, 
       accountID, userType, parentId, emailVerified, full_data) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    
    const values = [
      user.userID || null,
      user.firstName || '',
      user.lastName || '',
      user.username || '',
      user.country || '',
      user.openDate || null,
      user.accountID || null,
      user.userType || 1,
      user.parentId || null,
      user.emailVerified || false,
      JSON.stringify(user)
    ];

    const [result] = await pool.promise().query(sql, values);
    return result.affectedRows > 0;
  } catch (error) {
    console.error(`❌ Error inserting user ${user.userID}:`, error.message);
    return false;
  }
}

// External API integration
async function fetchFromExternalAPI() {
  try {
    console.log('🔄 Fetching data from external API...');
    
    const response = await fetch(`${process.env.EXTERNAL_API_BASE_URL}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ External API data fetched successfully');
    return data;
  } catch (error) {
    console.error('❌ Error fetching from external API:', error.message);
    return null;
  }
}

// API Routes

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const [results] = await pool.promise().query('SELECT COUNT(*) as total FROM users');
    res.json({ 
      status: 'healthy', 
      totalUsers: results[0].total,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Database connection failed',
      error: error.message 
    });
  }
});

// Fetch from external API and save users
app.post('/api/fetch-external-data', async (req, res) => {
  try {
    const externalData = await fetchFromExternalAPI();
    
    if (!externalData) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to fetch data from external API'
      });
    }

    // Process and save the external data
    let savedCount = 0;
    let updatedCount = 0;
    
    if (Array.isArray(externalData)) {
      for (const user of externalData) {
        const exists = await userExists(user.userID);
        if (exists) {
          await updateUser(user);
          updatedCount++;
        } else {
          await insertUser(user);
          savedCount++;
        }
      }
    }

    res.json({
      status: 'success',
      message: 'Data fetched and saved successfully',
      summary: {
        newUsers: savedCount,
        updatedUsers: updatedCount,
        totalProcessed: savedCount + updatedCount
      }
    });

  } catch (error) {
    console.error('Error fetching external data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching external data',
      error: error.message
    });
  }
});

// Save users endpoint
app.post('/api/saveUsers', async (req, res) => {
  try {
    console.log('📥 Received POST request to /api/saveUsers');
    
    let users = [];
    
    if (req.body.data && Array.isArray(req.body.data)) {
      users = req.body.data;
      console.log('📊 Found data array with', users.length, 'users');
    } else if (Array.isArray(req.body)) {
      users = req.body;
      console.log('📊 Found array with', users.length, 'users');
    } else {
      return res.status(400).json({
        status: 'error',
        message: 'Expected { data: [users] } or [users] format'
      });
    }

    if (users.length === 0) {
      return res.json({
        status: 'success',
        message: 'No users to save',
        saved: 0,
        updated: 0
      });
    }

    let savedCount = 0;
    let updatedCount = 0;
    let errorCount = 0;

    for (const user of users) {
      try {
        if (!user.userID) {
          console.log('⚠️ Skipping user without userID');
          continue;
        }

        const exists = await userExists(user.userID);
        
        if (exists) {
          const updated = await updateUser(user);
          if (updated) updatedCount++;
          else errorCount++;
        } else {
          const inserted = await insertUser(user);
          if (inserted) savedCount++;
          else errorCount++;
        }
        
      } catch (error) {
        errorCount++;
        console.error(`❌ Error processing user ${user.userID}:`, error.message);
      }
    }

    console.log(`✅ Save completed: ${savedCount} new, ${updatedCount} updated, ${errorCount} errors`);
    
    res.json({
      status: 'success',
      message: `Processed ${users.length} users successfully`,
      summary: {
        totalReceived: users.length,
        newUsers: savedCount,
        updatedUsers: updatedCount,
        errors: errorCount
      }
    });

  } catch (error) {
    console.error('❌ Server error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    
    const [users] = await pool.promise().query(
      `SELECT userID, firstName, lastName, username, country, openDate, 
              accountID, userType, parentId, emailVerified, created_at 
       FROM users 
       ORDER BY openDate DESC 
       LIMIT ?`, 
      [limit]
    );

    const [countResults] = await pool.promise().query('SELECT COUNT(*) as total FROM users');
    const total = countResults[0].total;

    res.json({
      status: 'success',
      total: total,
      showing: users.length,
      users: users
    });
    
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching users',
      error: error.message
    });
  }
});

// Get user by ID
app.get('/api/users/:id', async (req, res) => {
  try {
    const userId = req.params.id;
    const [results] = await pool.promise().query('SELECT * FROM users WHERE userID = ?', [userId]);
    
    if (results.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    res.json({
      status: 'success',
      user: results[0]
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching user',
      error: error.message
    });
  }
});

// Get statistics
app.get('/api/stats', async (req, res) => {
  try {
    const [totalUsers] = await pool.promise().query('SELECT COUNT(*) as count FROM users');
    const [todayUsers] = await pool.promise().query(
      'SELECT COUNT(*) as count FROM users WHERE DATE(openDate) = CURDATE()'
    );
    const [countries] = await pool.promise().query(
      'SELECT COUNT(DISTINCT country) as count FROM users WHERE country IS NOT NULL AND country != ""'
    );
    const [recentUsers] = await pool.promise().query(
      'SELECT COUNT(*) as count FROM users WHERE openDate >= DATE_SUB(NOW(), INTERVAL 7 DAY)'
    );

    res.json({
      status: 'success',
      stats: {
        totalUsers: totalUsers[0].count,
        todayUsers: todayUsers[0].count,
        countries: countries[0].count,
        recentUsers: recentUsers[0].count
      }
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error fetching statistics',
      error: error.message
    });
  }
});

// Test data endpoint
app.post('/api/test-data', async (req, res) => {
  try {
    const testUsers = [
      {
        userID: 1001,
        firstName: 'John',
        lastName: 'Doe',
        username: 'johndoe',
        country: 'United States',
        openDate: '2024-01-15T10:30:00Z',
        accountID: 5001,
        userType: 1,
        emailVerified: true
      },
      {
        userID: 1002,
        firstName: 'Jane',
        lastName: 'Smith',
        username: 'janesmith',
        country: 'Canada',
        openDate: '2024-01-16T14:20:00Z',
        accountID: 5002,
        userType: 1,
        emailVerified: true
      },
      {
        userID: 1003,
        firstName: 'Bob',
        lastName: 'Johnson',
        username: 'bobjohnson',
        country: 'United Kingdom',
        openDate: '2024-01-17T09:15:00Z',
        accountID: 5003,
        userType: 2,
        emailVerified: false
      }
    ];

    let savedCount = 0;
    for (const user of testUsers) {
      const exists = await userExists(user.userID);
      if (!exists) {
        await insertUser(user);
        savedCount++;
      }
    }

    res.json({
      status: 'success',
      message: `Created ${savedCount} test users`,
      data: testUsers
    });
    
  } catch (error) {
    console.error('Error creating test data:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error creating test data',
      error: error.message
    });
  }
});

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`📍 Port: ${PORT}`);
  console.log(`✅ WINX TRADE User Management System Ready!`);
  console.log(`📊 API Endpoints:`);
  console.log(`   GET  /api/users - Get all users`);
  console.log(`   POST /api/saveUsers - Save/update users`);
  console.log(`   POST /api/fetch-external-data - Fetch from external API`);
  console.log(`   GET  /api/health - Health check`);
  console.log(`   GET  /api/stats - Get statistics`);
  console.log(`   POST /api/test-data - Create test data`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Shutting down gracefully...');
  pool.end(() => {
    console.log('✅ Database connections closed');
    process.exit(0);
  });
});