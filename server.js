import * as dotenv from 'dotenv'
dotenv.config()
import dbConnector from './config/dbConnector.js'
import housesScraper from './housesScraper.js'

try {
  const db = await dbConnector()
  const houses = await housesScraper()
  await db.collection('houses').insertMany(houses)
  console.log(`${houses.length} houses stored successfully`)
  process.exit(0)
} catch (error) {
  console.log(error)
  process.exit(1)
}
