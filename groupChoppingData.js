import xlsx from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve paths for the current directory and files
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load the Excel file
const filePath = path.resolve(__dirname, './Choppingv1.xlsx'); // Replace with your actual file path
const workbook = xlsx.readFile(filePath);

// Get the first worksheet
const worksheet = workbook.Sheets[workbook.SheetNames[0]];

// Convert the worksheet to JSON
const data = xlsx.utils.sheet_to_json(worksheet);

// Process the data to group and sum
const groupedData = {};

data.forEach(row => {
  const runIdPart = row['Run Id'].split('-')[0]; // Extract the first part of Run Id
  const date = new Date(row['Timestamp']).toISOString().split('T')[0]; // Extract date
  const itemCode = row['item Code']; // Correct case-sensitive column name
  const itemType = row['Item Type']; // Input or Output
  const weight = parseFloat(row['Weight']) || 0; // Convert weight to float, default to 0

  // Grouping Key
  const key = `${runIdPart}_${date}_${itemCode}_${itemType}`;

  if (!groupedData[key]) {
    groupedData[key] = {
      'Run Id Part': runIdPart,
      Date: date,
      'Item Code': itemCode, // Include the Item Code
      'Item Type': itemType, // Include the Item Type (Input/Output)
      Weight: 0, // Initialize weight
    };
  }

  groupedData[key].Weight += weight; // Accumulate weight
});

// Convert grouped data to an array
const summarizedData = Object.values(groupedData);

// Create a new worksheet with the summarized data
const newWorksheet = xlsx.utils.json_to_sheet(summarizedData);

// Add the new worksheet to the workbook
xlsx.utils.book_append_sheet(workbook, newWorksheet, 'Summarized Data');

// Save the workbook with summarized data
const outputFilePath = path.resolve(__dirname, './summarized_data.xlsx'); // Output file path
xlsx.writeFile(workbook, outputFilePath);

console.log(`Summarized data written to ${outputFilePath}`);
