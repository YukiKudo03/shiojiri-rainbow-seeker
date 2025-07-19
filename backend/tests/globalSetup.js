const { execSync } = require('child_process');

module.exports = async () => {
  console.log('🔧 Setting up test environment...');
  
  // Set test environment variable
  process.env.NODE_ENV = 'test';
  
  // Create test database if it doesn't exist
  try {
    execSync(`createdb shiojiri_rainbow_test 2>/dev/null || true`, { stdio: 'inherit' });
    console.log('✅ Test database created or already exists');
  } catch (error) {
    console.log('ℹ️ Test database setup skipped (may already exist)');
  }
};