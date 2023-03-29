import { MongoClient } from 'mongodb'

export default async function dbConnector() {
  const { MONGODB_URL } = process.env

  const mongoClient = new MongoClient(MONGODB_URL)
  await mongoClient.connect()
  console.log('Database connected')
  const db = mongoClient.db('houses-scraper')
  return db
}
