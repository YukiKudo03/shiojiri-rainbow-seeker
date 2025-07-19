// Mock database for testing when PostgreSQL is not available
class MockPool {
  constructor() {
    this.users = [];
    this.rainbows = [];
    this.userLocations = [];
    this.nextUserId = 1;
    this.nextRainbowId = 1;
    this.nextLocationId = 1;
  }

  async query(sql, params = []) {
    // Mock different SQL operations
    
    // CREATE TABLE operations
    if (sql.includes('CREATE TABLE')) {
      return { rows: [], rowCount: 0 };
    }

    // CREATE FUNCTION operations
    if (sql.includes('CREATE OR REPLACE FUNCTION')) {
      return { rows: [], rowCount: 0 };
    }

    // DELETE operations
    if (sql.includes('DELETE FROM users')) {
      this.users = [];
      return { rows: [], rowCount: 0 };
    }
    if (sql.includes('DELETE FROM rainbow_sightings')) {
      this.rainbows = [];
      return { rows: [], rowCount: 0 };
    }
    if (sql.includes('DELETE FROM user_locations')) {
      this.userLocations = [];
      return { rows: [], rowCount: 0 };
    }

    // ALTER SEQUENCE operations
    if (sql.includes('ALTER SEQUENCE')) {
      this.nextUserId = 1;
      this.nextRainbowId = 1;
      this.nextLocationId = 1;
      return { rows: [], rowCount: 0 };
    }

    // INSERT user
    if (sql.includes('INSERT INTO users')) {
      const [name, email, password] = params;
      const user = {
        id: this.nextUserId++,
        name,
        email,
        password,
        created_at: new Date()
      };
      this.users.push(user);
      return { rows: [user], rowCount: 1 };
    }

    // SELECT user by email
    if (sql.includes('SELECT * FROM users WHERE email')) {
      const [email] = params;
      const user = this.users.find(u => u.email === email);
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    // SELECT user by id
    if (sql.includes('SELECT * FROM users WHERE id')) {
      const [id] = params;
      const user = this.users.find(u => u.id === parseInt(id));
      return { rows: user ? [user] : [], rowCount: user ? 1 : 0 };
    }

    // INSERT rainbow sighting
    if (sql.includes('INSERT INTO rainbow_sightings')) {
      const [userId, latitude, longitude, description, imageUrl, weatherConditions] = params;
      const rainbow = {
        id: this.nextRainbowId++,
        user_id: userId,
        latitude,
        longitude,
        description,
        image_url: imageUrl,
        weather_conditions: weatherConditions,
        verified: false,
        created_at: new Date()
      };
      this.rainbows.push(rainbow);
      return { rows: [rainbow], rowCount: 1 };
    }

    // UPDATE user
    if (sql.includes('UPDATE users')) {
      // User.update generates: UPDATE users SET field = $2, field2 = $3 WHERE id = $1
      // Parameters are: [id, ...Object.values(updates)]
      const userId = params[0]; // First parameter is always the user ID
      const userIndex = this.users.findIndex(u => u.id === parseInt(userId));
      
      if (userIndex !== -1) {
        // Parse SET clause to get field names
        const setClause = sql.match(/SET (.+) WHERE/)?.[1];
        if (setClause) {
          const updateData = {};
          const setFields = setClause.split(',').map(f => f.trim());
          
          // Map fields to parameter values starting from index 1
          setFields.forEach((field, index) => {
            const fieldName = field.split('=')[0].trim();
            const paramValue = params[index + 1];
            if (paramValue !== undefined) {
              updateData[fieldName] = paramValue;
            }
          });
          
          this.users[userIndex] = { 
            ...this.users[userIndex], 
            ...updateData,
            updated_at: new Date()
          };
        }
        return { rows: [this.users[userIndex]], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    // SELECT rainbow sightings
    if (sql.includes('SELECT * FROM rainbow_sightings')) {
      return { rows: this.rainbows, rowCount: this.rainbows.length };
    }

    // Default response
    return { rows: [], rowCount: 0 };
  }

  async end() {
    // Clean up mock data
    this.users = [];
    this.rainbows = [];
    this.userLocations = [];
    console.log('✅ Mock database connection closed');
  }

  on(event, callback) {
    if (event === 'connect') {
      setTimeout(() => callback(), 10);
    }
  }
}

module.exports = MockPool;