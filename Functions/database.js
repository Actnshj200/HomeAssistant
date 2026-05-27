// database.js
const { MongoClient } = require('mongodb');

const uri = 'mongodb+srv://hjmosley1:Mario200@mlcluster.teatmbg.mongodb.net/?retryWrites=true&w=majority&appName=MLCluster';

const client = new MongoClient(uri);


async function connectToDatabase() {
    try {
        const db = client.db('test');
        console.log(db);
        console.log('Connecting to MongoDB Atlas');
        await client.connect();
        console.log('Connected to MongoDB Atlas');
        return client.db('MLCluster');
    } catch (error) {
        console.error('Error connecting to MongoDB Atlas:', error);
        console.error('Error details:', error.message);
        console.error('Error stack trace:', error.stack);
        throw error;
    }
}

async function getConversationHistory(sessionId) {
    const db = await connectToDatabase();
    const collection = db.collection('MLHistory');
    const history = await collection.findOne({ sessionId });
    return history || { sessionId, messages: [] };
}

async function saveConversationHistory(history) {
    const db = await connectToDatabase();
    const collection = db.collection('MLHistory');
    await collection.updateOne({ sessionId: history.sessionId }, { $set: history }, { upsert: true });
}

async function closeDatabase() {
    await client.close();
}

module.exports = {
    connectToDatabase,
    getConversationHistory,
    saveConversationHistory,
    closeDatabase,
};