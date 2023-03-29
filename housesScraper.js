import puppeteer from 'puppeteer'
import cities from './cities.js'

const TIMEOUT = { timeout: 5000 }

async function autoScrollToDown(page) {
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0
      const distance = 500

      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight
        window.scrollBy(0, distance)
        totalHeight += distance

        if (totalHeight >= scrollHeight - window.innerHeight) {
          clearInterval(timer)
          resolve()
        }
      }, 50)
    })
  })
}

async function getBrowserContext() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--window-size=1920,1080'],
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  })

  const page = await browser.newPage()

  return { browser, page }
}

async function clickInitialModalCloseButton(page) {
  await page.click('[data-testid="TcfAccept"]')
}

function clickNextPaginationButton(page) {
  try {
    page.click('.sui-MoleculePagination > li:last-of-type')
  } catch (error) {
    console.log(error)
  }
}

async function getLastPagination(page) {
  return page.evaluate(() => {
    return Number(
      document.querySelector('.sui-MoleculePagination > li:nth-last-child(2)')
        .innerText
    )
  })
}

async function scrapeHousesByCityAndPage(city, page) {
  const houses = await page.evaluate(() => {
    const HOUSE_CONTAINER_SELECTOR = '.re-SearchResult > article'
    const TITLE_SELECTOR = '.re-CardTitle'
    const PRICE_SELECTOR = '.re-CardPrice'
    const INFO_LIST_SELECTOR = ':scope > div li'

    function isStrIncluded(node, str) {
      return node.innerText.trim().toLowerCase().includes(str)
    }

    const housesNodes = document.querySelectorAll(HOUSE_CONTAINER_SELECTOR)

    return Array.from(housesNodes).map(house => {
      const titleNode = house.querySelector(TITLE_SELECTOR)
      const type = titleNode ? titleNode.childNodes[0].innerText.trim() : null
      const title = titleNode ? titleNode.textContent.trim() : null

      const priceNode = house.querySelector(PRICE_SELECTOR)
      const price = priceNode
        ? Number(priceNode.innerText.trim().slice(0, -2).replace('.', ''))
        : null

      const infoNodeList = house.querySelectorAll(INFO_LIST_SELECTOR)
      const iterableInfoNodeList = Array.from(infoNodeList)

      const sizeNode = iterableInfoNodeList.find(node =>
        node.innerText.includes('m²')
      )
      const size = sizeNode
        ? Number(sizeNode.innerText.trim().slice(0, -3))
        : null

      const roomsNode = iterableInfoNodeList.find(node =>
        isStrIncluded(node, 'hab')
      )
      let rooms = null

      if (roomsNode) {
        const roomsRaw = roomsNode.innerText.trim()
        rooms = Number(roomsRaw.slice(0, roomsRaw.indexOf(' ')))
      }

      const hasParking = iterableInfoNodeList.some(node =>
        isStrIncluded(node, 'parking')
      )
      const hasElevator = iterableInfoNodeList.some(node =>
        isStrIncluded(node, 'ascensor')
      )
      const hasAir = iterableInfoNodeList.some(node =>
        isStrIncluded(node, 'aire')
      )

      return {
        type,
        title,
        price,
        size,
        rooms,
        sale: true,
        hasParking,
        hasElevator,
        hasAir
      }
    })
  })

  return houses.map(house => ({ ...house, city }))
}

async function waitAndCloseRandomModal(page) {
  const RANDOM_MODAL_CONTAINER_SELECTOR = 'div[role=dialog]'
  const RANDOM_MODAL_CLOSE_BUTTON_SELECTOR =
    'div[role=dialog] > button[aria-label="Close Message"]'

  try {
    await page.waitForSelector(RANDOM_MODAL_CONTAINER_SELECTOR, TIMEOUT)
    page.click(RANDOM_MODAL_CLOSE_BUTTON_SELECTOR)
  } catch (_) {
    console.error('Error al intentar cerrar la modal random')
  }
}

async function getHousesByCity(city) {
  const FOTOCASA_URL = `https://www.fotocasa.es/es/comprar/viviendas/${city}-provincia/todas-las-zonas/l/1`
  const CONTAINER_SELECTOR = '.re-SearchResult'
  const housesByCity = []

  const { browser, page } = await getBrowserContext()
  await page.goto(FOTOCASA_URL)
  await clickInitialModalCloseButton(page)
  await autoScrollToDown(page)
  const lastPagination = await getLastPagination(page)

  for (let pagination = 1; pagination <= lastPagination; pagination++) {
    await page.waitForSelector(CONTAINER_SELECTOR, TIMEOUT)
    await autoScrollToDown(page)

    const housesByCityAndPage = await scrapeHousesByCityAndPage(city, page)
    console.log(city, pagination, housesByCityAndPage.length)
    housesByCity.push(...housesByCityAndPage)

    clickNextPaginationButton(page)

    try {
      await page.waitForNavigation({ waitUntil: 'domcontentloaded' })
    } catch (_) {
      console.error('Error en el cambio de página')
      waitAndCloseRandomModal(page)
    }
  }

  console.log(city, 'total', housesByCity.length, '\n')
  return housesByCity
}

export default async function housesScraper() {
  console.log('Scripting started \n')
  let houses = []

  for (let city of cities) {
    const cityHouses = await getHousesByCity(city)
    houses.push(...cityHouses)
  }

  console.log(`${houses.length} houses scraped successfully`)
  return houses
}
