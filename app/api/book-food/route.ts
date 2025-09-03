/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from "next/server";

export async function GET() {
  let browser;
  try {
    const isVercel = !!process.env.VERCEL_ENV;
    let puppeteer: any,
      launchOptions: any = {
        headless: true,
      };

    if (isVercel) {
      const chromium = (await import("@sparticuz/chromium-min")).default;
      puppeteer = await import("puppeteer-core");
      launchOptions = {
        ...launchOptions,
        args: chromium.args,
        executablePath: await chromium.executablePath(
          "https://github.com/Sparticuz/chromium/releases/download/v138.0.2/chromium-v138.0.2-pack.x64.tar"
        ),
      };
    } else {
      puppeteer = await import("puppeteer");
    }

    browser = await puppeteer.launch(launchOptions);
    const page = await browser.newPage();

    await page.setUserAgent(
      // "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:117.0) Gecko/20100101 Firefox/117.0"
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36"
    );

    await page.setViewport({ width: 1920, height: 1080 });

    // Navigate to login page
    await page.goto(process.env.LOGIN_URL, {
      waitUntil: "networkidle2",
    });

    await page.waitForSelector('input[name="email"]', { state: "visible" });
    await page.type('input[name="email"]', process.env.LOGIN_EMAIL);

    await page.waitForSelector('input[name="pwd"]', { state: "visible" });
    await page.type('input[name="pwd"]', process.env.LOGIN_PASSWORD);

    // Submit and wait for navigation
    await page.waitForSelector('input[type="submit"]', {
      state: "visible",
    });
    await Promise.all([
      page.click('input[type="submit"]'),
      page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);
    // Verify login worked
    const currentUrl = page.url();

    // Method 1: Check URL
    if (!currentUrl.includes("/home/dashboard")) {
      return NextResponse.json(
        { success: false, error: "Login failed" },
        { status: 401 }
      );
    }

    // Define which options you want from each fieldset
    const selections: Record<string, string> = {
      "Main Course": "Rice",
      "Side Dish": "Plantain",
      Protein: "Chicken",
      Dessert: "Water",
    };

    await page.goto(`${process.env.BASE_URL}/adm/mealbooking/new`, {
      waitUntil: "networkidle2",
    });

    // Wait for the select to be attached
    await page.waitForSelector('select[name="locationnid"]');

    // Select the second option (value="1")
    // await page.selectOption('select[name="locationnid"]', { value: "1" });
    const selectHandle = await page.$('select[name="locationnid"]');
    const options = await selectHandle.$$("option");
    if (options.length > 1) {
      const value = await options[1].evaluate(
        (el: HTMLOptionElement) => el.value
      );
      await page.select('select[name="locationnid"]', value);
    }
    await page.waitForSelector("fieldset");

    // Get all fieldsets on the page
    const fieldsets = await page.$$("fieldset");
    // Log all fieldset elements' outerHTML for inspection
    for (const [, fieldset] of fieldsets.entries()) {
      await fieldset.evaluate((el: Element) => el.outerHTML);
      // Get legend text
      const legend: string = await fieldset.$eval(
        "legend",
        (el: Element) => el.textContent?.trim() || ""
      );
      // console.log(`Legend[${i}]:`, legend);
      // Check if legend matches selections
      const wanted = selections[legend];
      if (!wanted) continue; // skip fieldsets we don’t care

      // Find all labels inside this fieldset
      const labels = await fieldset.$$("label");
      for (const label of labels) {
        const text: string = await label.evaluate(
          (el: Element) => el.textContent?.trim() || ""
        );
        if (text.includes(wanted)) {
          await label.click();
          break;
        }
      }
    }

    // Attach a one-time listener for the confirm dialog
    page.once("dialog", async (dialog: any) => {
      if (dialog.type() === "confirm") {
        await dialog.accept();
      } else {
        await dialog.dismiss();
      }
    });

    // Click the submit button and wait for alert container
    await page.click('input[type="submit"][value="Submit"]');

    // Wait for the alert container and extract the message
    let alertMessage = null;
    try {
      await page.waitForSelector('[data-notify="container"]', {
        timeout: 5000,
      });
      alertMessage = await page.$eval(
        '[data-notify="message"]',
        (el: Element) => el.textContent?.trim() || ""
      );
      console.log("Alert message:", alertMessage);
    } catch {
      console.log("No alert message found after submit.");
    }

    return NextResponse.json({
      success: true,
      message: alertMessage || "Task completed successfully",
    });
  } catch (error: any) {
    console.error("Automation error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error.message || "An error occurred while processing automation task",
      },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
