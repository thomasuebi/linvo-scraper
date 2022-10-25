import { LinkedinServicesInterface } from "./linkedin.services.interface"
import { CDPSession, Page } from "puppeteer"
import { LinkedinAbstractService } from "./linkedin.abstract.service"
import { gotoUrl } from "../helpers/gotoUrl"
import { timer } from "../helpers/timer"
import { shuffle } from "lodash"
import axios from "axios"

export class LinkedinEngagementService
  extends LinkedinAbstractService
  implements LinkedinServicesInterface<any>
{
  async process(
    page: Page,
    cdp: CDPSession,
    data: {
      AIGeneratedComments?: { enabled: boolean; texterousApiToken: string }
    }
  ) {
    gotoUrl(page, "https://www.linkedin.com/feed/")

    await this.waitForLoader(page)

    await page.mouse.wheel({
      deltaY: 1500,
    })

    await timer(4000)

    await page.waitForFunction(() => {
      return (
        Array.from(
          document.querySelectorAll(
            '[type="like-icon"], [type="thumbs-up-outline"]'
          )
        ) || []
      )
        .map((curr) => {
          return curr
            .closest("button:not(.react-button--active)")
            ?.getAttribute("id")
        })
        .filter((f) => f)
    })

    // @ts-ignore
    const ids: Array<{
      id: string
      like: string
      comment: string
      totalLikes: number
      text: string
    }> = await page.evaluate(() => {
      return (
        Array.from(
          document.querySelectorAll(
            '[type="like-icon"], [type="thumbs-up-outline"]'
          )
        ) || []
      )
        .map((curr) => {
          const parent = curr
            ?.closest("button:not(.react-button--active)")
            ?.closest(".social-details-social-activity")!

          const content = curr
            ?.closest(".feed-shared-update-v2")
            ?.textContent?.replace(/<[^>]*>?/gm, "")
            ?.replace(/( {2,})/gm, " ")
            ?.replace(/(\\n){2,}/gm, "\n")
          return {
            content,
            like: parent
              .querySelector('[type="thumbs-up-outline"]')
              ?.closest("button")
              ?.getAttribute("id"),
            comment: parent
              .querySelector(".comment-button")
              ?.getAttribute("id"),
            id: parent?.getAttribute("id"),
            // ?.querySelector(".update-components-text")?.innerHTML,
            totalLikes: +(
              parent
                ?.querySelector(
                  ".social-details-social-counts__reactions-count, .social-details-social-counts__social-proof-text"
                )
                ?.textContent?.match(/\d/g)
                ?.join("") || 0
            ),
          }
        })
        .filter((f) => f.id)
        .slice(0, 4)
    })

    if (!ids.length) {
      return
    }

    for (const id of ids) {
      try {
        await this.moveMouseAndScroll(
          page,
          `#${id.like}`,
          undefined,
          false,
          -700
        )
        await timer(1000)
        await this.moveAndClick(page, `#${id.like}`)
        await timer(1000)
        if (data?.AIGeneratedComments?.enabled) {
          if (id.totalLikes > 15 && id.text?.length > 150) {
            const input = ""
            const post = id.text // Post
            const person = "technical person" // Briefly describe yourself (e.g. 'sales guy')
            console.log("Applying texterous.com's magic!")
            const response = await axios.post(
              "https://us-central1-alpaca-383f8.cloudfunctions.net/api/api/completion?api-key=" +
                data?.AIGeneratedComments?.texterousApiToken,
              {
                data: {
                  input,
                  applet: "XTVLt0UAsmDVLAxF5Of0",
                  inputs: { post, person },
                },
              },
              { timeout: 10000 }
            )

            console.log(id.text, response.data.completion?.split("\n")?.[0])
          }
        } else if (id.totalLikes > 30) {
          await this.moveMouseAndScroll(
            page,
            `#${id.comment}`,
            undefined,
            false,
            -700
          )
          await timer(1000)
          await this.moveAndClick(page, `#${id.comment}`)
          await timer(1000)
          // await page.keyboard.type(
          //   shuffle([
          //     "Thank you for sharing",
          //     "Great Share",
          //     "Cool",
          //     "Thanks for posting 💯🔥",
          //     "💯💯",
          //     "Great content keep it up 👌🏼",
          //     "Great 👍",
          //     "Awesome!!",
          //   ])[0],
          //   { delay: 20 }
          // )
          // await timer(1000)
          // await this.moveAndClick(page, ".comments-comment-box__submit-button")
        }
      } catch (err) {
        console.log(JSON.stringify(err))
      }
    }
  }
}
