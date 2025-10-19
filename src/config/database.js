const mongoose = require('mongoose');
const config = require('./config');
const logger = require('../utils/logger');

const connectDB = async () => {
    try {
        // Note: useNewUrlParser and useUnifiedTopology are deprecated and no longer needed
        // in Mongoose 6.0+. They are now the default behavior.
        const options = {
            // Add any custom options here if needed
        };

        await mongoose.connect(config.mongoURI, options);
        
        logger.info(`MongoDB Connected: ${mongoose.connection.host}`);
        logger.info(`Database: ${mongoose.connection.name}`);
        
        // Handle connection events
        mongoose.connection.on('error', (err) => {
            logger.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        process.on('SIGINT', async () => {
            await mongoose.connection.close();
            logger.info('MongoDB connection closed due to app termination');
            process.exit(0);
        });

    } catch (error) {
        logger.error('MongoDB connection failed:', error);
        process.exit(1);
    }
};

module.exports = connectDB;
