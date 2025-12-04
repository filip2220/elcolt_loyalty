const mysql = require('mysql2/promise');

// Create a connection pool to the database.
// This is more efficient than creating a new connection for every request.
// Configuration is loaded from environment variables.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Cast BIGINT columns to strings to avoid JSON serialization errors.
  supportBigNumbers: true,
  bigNumberStrings: true,
  // Return DATETIME columns as strings to avoid issues with invalid dates.
  dateStrings: true,
  // SSL is recommended for secure connections to your database.
  // The exact configuration might vary based on your cloud provider.
  // For Google Cloud SQL, you might need to download the CA certificate.
  // ssl: {
  //   rejectUnauthorized: true,
  //   // ca: fs.readFileSync('/path/to/server-ca.pem'),
  // }
});

module.exports = {
  query: (sql, params) => pool.execute(sql, params),
  pool // Export the pool for transactions
};