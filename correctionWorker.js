import fs from 'fs/promises';
import moment from 'moment';
import winston from 'winston';
import { processChoppingDataByDay } from './correction.js';

// Configure the logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'worker.log' })
  ],
});

// Path to the configuration file
const configFilePath = './worker-config.json';

// Function to process data by day
// const processChoppingDataByDay = async (startDate, endDate) => {
//   logger.info(`Processing data from ${startDate} to ${endDate}...`);
//   // Simulate data processing delay
//   await new Promise((resolve) => setTimeout(resolve, 120000));
//   logger.info(`Finished processing data from ${startDate} to ${endDate}.`);
// };

// Function to load the configuration
const loadConfig = async () => {
  try {
    const configData = await fs.readFile(configFilePath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    logger.error(`Error loading config: ${error.message}`);
    throw error;
  }
};

// Function to save the configuration
const saveConfig = async (config) => {
  try {
    await fs.writeFile(configFilePath, JSON.stringify(config, null, 2));
    logger.info('Configuration updated successfully.');
  } catch (error) {
    logger.error(`Error saving config: ${error.message}`);
    throw error;
  }
};

// Worker function
const startWorker = async () => {
  try {
    // Load the current configuration
    const config = await loadConfig();

    // Extract startDate and endDate
    const { startDate, endDate } = config;
    const currentEndDate = moment().format('YYYY-MM-DD');

    // Process data for the given range
    await processChoppingDataByDay(startDate, endDate);

    // Update the configuration for the next run
    config.startDate = endDate; // Update startDate to the last processed endDate
    config.endDate = currentEndDate; // Update endDate to the current date

    // Save the updated configuration
    await saveConfig(config);
  } catch (error) {
    logger.error(`Error in worker process: ${error.message}`);
  }
};

// Start the worker
startWorker().catch((err) =>
  logger.error(`Unhandled error in worker process: ${err.message}`)
);
