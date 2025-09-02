import { NextResponse } from "next/server";
import chromium from "chrome-aws-lambda";
import puppeteer from "puppeteer-core";

export async function GET() {
  let browser = null;

  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath:
        process.env.NODE_ENV === "production"
          ? await chromium.executablePath
          : undefined, // local puppeteer path
      headless: true,
    });

    const page = await browser.newPage();

    // Navigate to login page
    await page.goto("https://example.com/login", { waitUntil: "networkidle2" });

    // Fill login form
    await page.type("#username", "your-username");
    await page.type("#password", "your-password");

    // Submit
    await Promise.all([
      page.click("#login-button"),
      page.waitForNavigation({ waitUntil: "networkidle2" }),
    ]);

    // Fill another form after login
    await page.type("#some-field", "some value");
    await page.click("#submit-button");

    // Extract success message
    const result = await page.$eval("#success-msg", (el) => el.textContent);

    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
