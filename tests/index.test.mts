import puppeteer from "puppeteer-core";
import { describe, it, expect } from "vitest";
const browser = await puppeteer.launch();
const newTab = await browser.newPage();
describe("High loaded /text.txt", () => {});
