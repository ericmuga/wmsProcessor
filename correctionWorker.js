import fs from 'fs/promises';
import moment from 'moment';
import winston from 'winston';

import {processChoppingDataByDay} from './correction.js';

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
    new winston.transports.File({ filename: 'worker.log' }),
  ],
});

// Path to the configuration file
const configFilePath = './worker-config.json';

// Function to process data by day
// const processChoppingDataByDay = async (startDate, endDate) => {
//   logger.info(`Processing data from ${startDate} to ${endDate}...`);
//   // Simulate data processing delay
//   await new Promise((resolve) => setTimeout(resolve, 2000));
//   logger.info(`Finished processing data from ${startDate} to ${endDate}.`);
// };

// Function to load the configuration
const loadConfig = async () => {
  try {
    const configData = await fs.readFile(configFilePath, 'utf8');

    if (!configData.trim()) {
      logger.warn('Configuration file is empty. Using default values.');
      return { startDate: moment().subtract(1, 'day').format('YYYY-MM-DD'), endDate: moment().format('YYYY-MM-DD') };
    }

    const config = JSON.parse(configData);
    if (!config.startDate || !config.endDate) {
      logger.warn('Configuration file is missing required fields. Using default values.');
      return { startDate: moment().subtract(1, 'day').format('YYYY-MM-DD'), endDate: moment().format('YYYY-MM-DD') };
    }

    return config;
  } catch (error) {
    if (error.code === 'ENOENT') {
      logger.warn('Configuration file not found. Creating a new one with default values.');
      const defaultConfig = {
        startDate: moment().subtract(1, 'day').format('YYYY-MM-DD'),
        endDate: moment().format('YYYY-MM-DD'),
      };
      await saveConfig(defaultConfig);
      return defaultConfig;
    } else {
      logger.error(`Error loading config: ${error.message}`);
      throw error;
    }
  }
};

// Function to save the configuration
const saveConfig = async (config) => {
  try {
    // Ensure the config object is valid before writing
    if (!config || typeof config !== 'object' || !config.startDate || !config.endDate) {
      throw new Error('Invalid configuration object provided for saving.');
    }

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
    const config = await loadConfig();
    const { startDate, endDate } = config;
    const currentEndDate = moment().format('YYYY-MM-DD');

    // Ensure dates are valid before processing
    if (!moment(startDate, 'YYYY-MM-DD', true).isValid() || !moment(endDate, 'YYYY-MM-DD', true).isValid()) {
      throw new Error('Invalid dates in configuration. Please check your config file.');
    }

    // Process data for the given range
    await processChoppingDataByDay(startDate, endDate);

    // Update the configuration for the next run
    config.startDate = endDate;
    config.endDate = currentEndDate;

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
