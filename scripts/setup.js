const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up WINX TRADE Management System...');

// Create necessary directories
const directories = [
  'public',
  'scripts', 
  'docs',
  'logs'
];

directories.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  }
});

// Copy environment template if .env doesn't exist
if (!fs.existsSync('.env')) {
  const envTemplate = `# Server Configuration
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:3000

# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=winxapi_db
DB_SSL=false

# Security
JWT_SECRET=your-jwt-secret-key-change-in-production
API_RATE_LIMIT=1000
`;
  
  fs.writeFileSync('.env', envTemplate);
  console.log('✅ Created .env file');
}

console.log('✅ Setup completed!');
console.log('📝 Next steps:');
console.log('   1. Configure your database in .env file');
console.log('   2. Run: npm install');
console.log('   3. Run: npm run dev');