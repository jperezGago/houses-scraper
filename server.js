import * as dotenv from 'dotenv'
dotenv.config()
import housesScraper from './housesScraper.js'

try {
  const houses = await housesScraper()
  process.exit(0)
} catch (error) {
  console.log(error)
  process.exit(1)
}
