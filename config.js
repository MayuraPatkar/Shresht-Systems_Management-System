require('dotenv').config();

module.exports = {
    port: process.env.PORT || 3000, // Default port 3000 if PORT env variable is not set
    mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/shreshtSystems', // Default MongoDB URI
};