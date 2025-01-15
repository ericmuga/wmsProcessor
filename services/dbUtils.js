import sql from 'mssql';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Database configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

// Shared connection pool
let poolPromise;

export const getDbPool = async () => {
  if (!poolPromise) {
    poolPromise = sql.connect(dbConfig);
  }
  return poolPromise;
};




// Function to get data from the database
export const getChoppingData = async (sd = null, ed = null, ids = [], chopping_ids = []) => {
  let pool;
  try {
    // Get the shared connection pool
    pool = await getDbPool();

    // Build the query dynamically based on provided filters
    let query = `SELECT [id], [chopping_id], [item_code], [weight], [output], [batch_no], [created_at], [updated_at] FROM [calibra2].[dbo].[chopping_lines] WHERE 1=1`;

    // Add filters for start and end dates
    if (sd) {
      query += ` AND [created_at] >= @StartDate`;
    }
    if (ed) {
      query += ` AND [created_at] <= @EndDate`;
    }

    // Add filter for IDs
    if (ids.length > 0) {
      query += ` AND [id] IN (${ids.map((_, i) => `@ID${i}`).join(', ')})`;
    }

    // Add filter for chopping IDs
    if (chopping_ids.length > 0) {
      query += ` AND [chopping_id] IN (${chopping_ids.map((_, i) => `@ChoppingID${i}`).join(', ')})`;
    }

    // Create a request instance
    const request = pool.request();

    // Add parameters for dates
    if (sd) request.input('StartDate', sql.DateTime, sd);
    if (ed) request.input('EndDate', sql.DateTime, ed);

    // Add parameters for IDs
    ids.forEach((id, index) => {
      request.input(`ID${index}`, sql.Int, id);
    });

    // Add parameters for chopping IDs
    chopping_ids.forEach((chopping_id, index) => {
      request.input(`ChoppingID${index}`, sql.Int, chopping_id);
    });

    // Execute the query
    const result = await request.query(query);

    // Return the rows from the result
    return result.recordset;
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error('Failed to retrieve data from the database');
  }
};

export const processQueries= async(deleteQuery, updateQueries)=> {
  try {
    // Connect to the database
    const pool = getDbPool();

    // Start a transaction
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      // Execute the DELETE query
      if (deleteQuery) {
        await transaction.request().query(deleteQuery);
        console.log('Delete query executed successfully.');
      }

      // Execute the UPDATE queries
      for (const query of updateQueries) {
        await transaction.request().query(query);
        console.log(`Update query executed: ${query}`);
      }

      // Commit the transaction
      await transaction.commit();
      console.log('All queries executed successfully, transaction committed.');
    } catch (err) {
      // Rollback the transaction in case of error
      await transaction.rollback();
      console.error('Error executing queries, transaction rolled back:', err.message);
      throw err;
    } finally {
      // Close the connection pool
      await pool.close();
    }
  } catch (err) {
    console.error('Database connection failed:', err.message);
    throw err;
  }
}