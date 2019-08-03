#!/usr/bin/env node
"use strict";

require("make-promises-safe");

// Require Third-party Dependencies
const puppeteer = require("puppeteer");
const Spinner = require("@slimio/async-cli-spinner");

// CONSTANTS
const TIME_TO_WAIT = 6000;
const RE_EPISODES = /\/Episode-([0-9]+)\?id=([0-9]+)/g;

// Retrieve arguments
const [dramaName, wantedEpisode = null] = process.argv.slice(2);

/**
 * @async
 * @function scrapVideoPlayer
 * @param {*} browser
 * @param {!string} dramaLink
 * @returns {Promise<void>}
 */
async function scrapVideoPlayer(browser, dramaLink) {
    const episode = new URL(dramaLink).pathname.split("/").pop();
    const spin = new Spinner({
        spinner: "dots",
        prefixText: `${episode}:`
    }).start();

    try {
        const page = await browser.newPage();

        await page.goto(dramaLink);
        spin.text = "Waiting ...";
        await new Promise((resolve) => setTimeout(resolve, TIME_TO_WAIT));

        spin.text = "Search and decode embed link!";
        const HTML = await page.content();
        const match = /var src = \$kissenc\.decrypt\('([/A-Za-z0-9=+]+)/g.exec(HTML);
        if (match === null) {
            spin.failed(`Unable to found src embedlink: ${dramaLink}`);

            return void 0;
        }

        const [, base64Str] = match;
        const embedLink = await page.evaluate(async function inbox(str) {
            return $kissenc.decrypt(str);
        }, base64Str);
        if (typeof embedLink !== "string" || embedLink.trim() === "") {
            spin.failed(`Void embed link: ${dramaLink}`);

            return void 0;
        }
        spin.succeed(embedLink);

        return void 0;
    }
    catch (error) {
        spin.failed(error.message);

        return void 0;
    }
}

/**
 * @async
 * @function main
 */
async function main() {
    const spin = new Spinner({
        spinner: "dots",
        prefixText: dramaName
    }).start();
    const browser = await puppeteer.launch();
    try {
        const page = await browser.newPage();

        const dramaURLRoot = `https://kissasian.sh/Drama/${dramaName}`;
        spin.text = `goto: ${dramaURLRoot}`;
        await page.goto(dramaURLRoot);

        spin.text = "Waiting for 6 seconds...";
        await new Promise((resolve) => setTimeout(resolve, TIME_TO_WAIT));

        const HTML = await page.content();
        const episodesURL = [];
        {
            let rMatch;
            while ((rMatch = RE_EPISODES.exec(HTML)) !== null) {
                const [str, id] = rMatch;

                if (wantedEpisode !== null && wantedEpisode !== id) {
                    continue;
                }
                episodesURL.push(`${dramaURLRoot}${str}&s=mp`);
            }
        }
        spin.succeed(`Successfully fetched ${episodesURL.length} episodes!`);
        console.log("");

        for (let id = 0; id < episodesURL.length; id++) {
            const url = episodesURL[id];
            await scrapVideoPlayer(browser, url);
        }
        console.log("");
    }
    catch (error) {
        spin.failed(error.message);
    }
    finally {
        await browser.close();
    }
}
main().catch(console.error);
