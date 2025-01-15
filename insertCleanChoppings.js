import xlsx from 'xlsx';
import sql from 'mssql';
import path from 'path';
import { fileURLToPath } from 'url';

// Database configuration
const dbConfig = {
  user: 'reporter',
  password: 'p3u!~XuEdx?u2kK',
  server: 'fcl-wms',
  database: 'fcl-wms',
  options: {
    encrypt: true,
    trustServerCertificate: true,
  },
};

// Resolve file path for the Excel file
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const filePath = path.resolve(__dirname, './Choppingv1.xlsx'); // Replace with your Excel file name

// Read Excel file
const workbook = xlsx.readFile(filePath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = xlsx.utils.sheet_to_json(worksheet);

// Insert data into the database
const insertData = async () => {
  try {
    const pool = await sql.connect(dbConfig);

    // Default user_id (use a valid ID from your users table)
    const defaultUserId = 2;

    for (const row of rows) {
      const choppingId = row['Run Id'];
      const itemCode = row['item Code'];
      const weight = parseFloat(row['Weight']);
      const isOutput = row['Item Type'] === 'Output' ? 1 : 0;
      const batchNo = row['Batch No'] || null;
      const timestamp = row['Timestamp'];

      // Verify if user_id exists
      const userCheck = await pool
        .request()
        .input('user_id', sql.Int, defaultUserId)
        .query('SELECT id FROM users WHERE id = @user_id');

      if (userCheck.recordset.length === 0) {
        console.error(`User ID ${defaultUserId} does not exist. Skipping row.`);
        continue;
      }

      // Insert into choppings table if not already present
      const existingChopping = await pool
        .request()
        .input('chopping_id', sql.VarChar, choppingId)
        .query('SELECT id FROM choppings WHERE chopping_id = @chopping_id');

      if (existingChopping.recordset.length === 0) {
        await pool
          .request()
          .input('chopping_id', sql.VarChar, choppingId)
          .input('user_id', sql.Int, defaultUserId)
          .input('status', sql.TinyInt, 1) // Active status
          .input('created_at', sql.DateTime, timestamp)
          .input('updated_at', sql.DateTime, timestamp)
          .query(
            `INSERT INTO choppings (chopping_id, user_id, status, created_at, updated_at)
             VALUES (@chopping_id, @user_id, @status, @created_at, @updated_at)`
          );
      }

      // Insert into chopping_lines table
      await pool
        .request()
        .input('chopping_id', sql.VarChar, choppingId)
        .input('item_code', sql.VarChar, itemCode)
        .input('weight', sql.Float, weight)
        .input('output', sql.Bit, isOutput) // 1 for Output, 0 for Input
        .input('batch_no', sql.VarChar, batchNo)
        .input('created_at', sql.DateTime, timestamp)
        .input('updated_at', sql.DateTime, timestamp)
        .query(
          `INSERT INTO chopping_lines (chopping_id, item_code, weight, output, batch_no, created_at, updated_at)
           VALUES (@chopping_id, @item_code, @weight, @output, @batch_no, @created_at, @updated_at)`
        );
    }

    console.log('Data inserted successfully into choppings and chopping_lines!');
    await pool.close();
  } catch (error) {
    console.error('Error inserting data:', error);
  }
};

insertData();
