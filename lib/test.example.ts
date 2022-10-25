import * as LinvoScraper from "./linkedin.service"
import puppeteer from "puppeteer-extra"

// add stealth plugin and use defaults (all evasion techniques)
import StealthPlugin from "puppeteer-extra-plugin-stealth"
puppeteer.use(StealthPlugin())

import envy from "envy"

const env = envy()
console.log(env)
;(async () => {
  const browser = await puppeteer.launch({
    headless: false,
  })
  const page = await browser.newPage()
  const cdp = await page.target().createCDPSession()

  // that's the res Linvo is working in production
  await page.setViewport({
    width: 1440,
    height: 900,
  })

  try {
    // add ghost-cursor for maximum safety
    await LinvoScraper.tools.loadCursor(page, true)
    // Login with Linkedin
    console.log(env)
    const { token } = await LinvoScraper.services.login.process(page, cdp, {
      user: env.linkedinUser,
      password: env.linkedinPassword,
    })

    // set cookies
    await page.setCookie({
      name: "li_at",
      value: token,
      httpOnly: true,
      secure: true,
      sameSite: "None",
      priority: "Medium",
      path: "/",
      domain: ".www.linkedin.com",
    })

    await LinvoScraper.services.engagement.process(page, cdp, {
      AIGeneratedComments: {
        enabled: true,
        texterousApiToken: env.texterousApiKey,
      },
    })
  } catch (error) {
    console.log(JSON.stringify(error))
  }
  ;``
})()
