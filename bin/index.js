#!/usr/bin/env node
"use strict";

require("make-promises-safe");

// Require Third-party Dependencies
const puppeteer = require("puppeteer");
const Spinner = require("@slimio/async-cli-spinner");
const sade = require("sade");
const open = require("open");
const { white, cyan, green, yellow, red } = require("kleur");

// CONSTANTS
const TIME_TO_WAIT = 6000;
const RE_EPISODES = /\/Episode-([0-9]+)\?id=([0-9]+)/g;

sade("kissasian <name>", true)
    .version("1.1.0")
    .describe("Search a given kissasian drama")
    .example("kissasian Father-is-Strange")
    .option("-e, --episode <episode>", "select a given episode", null)
    .option("-o, --open", "open embed link in your default navigator")
    .option("-p, --player", "default player to fetch", "mp")
    .action(async(dramaName, opts) => {
        if (typeof opts.episode === "boolean") {
            opts.episode = "";
        }

        const wantedEpisode = opts.episode === null ? null : new Set(opts.episode.toString().split(","));
        await main(dramaName, {
            wantedEpisode,
            openLink: opts.open,
            player: opts.player
        });
    })
    .parse(process.argv);


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
        prefixText: `${episode}`
    }).start();

    try {
        const page = await browser.newPage();

        await page.goto(dramaLink, {
            timeout: 60000
        });
        spin.text = `Waiting for ${TIME_TO_WAIT / 1000} seconds...`;
        await new Promise((resolve) => setTimeout(resolve, TIME_TO_WAIT));

        spin.text = "Search and decode player embed link!";
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
        spin.succeed(yellow().bold(embedLink));

        return embedLink;
    }
    catch (error) {
        spin.failed(red().bold(error.message));

        return void 0;
    }
}

/**
 * @async
 * @function main
 * @param {!string} dramaName
 * @param {object} [options]
 * @param {Set<string>} [options.wantedEpisode]
 * @param {boolean} [options.openLink=false]
 * @param {string} [options.player]
 */
async function main(dramaName, options) {
    const { wantedEpisode = null, openLink = false, player = "mp" } = options;

    console.log(white().bold(`\n  > Searching for drame: ${cyan().bold(dramaName)}\n`));

    const spin = new Spinner({
        spinner: "dots",
        prefixText: "Episodes"
    }).start();

    const browser = await puppeteer.launch();
    try {
        const page = await browser.newPage();

        const dramaURLRoot = `https://kissasian.sh/Drama/${dramaName}`;
        await page.goto(dramaURLRoot);

        spin.text = `Waiting for ${cyan().bold(TIME_TO_WAIT / 1000)} seconds...`;
        await new Promise((resolve) => setTimeout(resolve, TIME_TO_WAIT));

        const HTML = await page.content();
        const episodesURL = [];
        {
            let rMatch;
            while ((rMatch = RE_EPISODES.exec(HTML)) !== null) {
                const [str, id] = rMatch;

                if (wantedEpisode !== null && !wantedEpisode.has(id)) {
                    continue;
                }
                episodesURL.push(`${dramaURLRoot}${str}&s=${player}`);
            }
        }
        spin.succeed(green().bold(`Successfully fetched ${episodesURL.length} episodes!`));
        console.log(white().bold("\n  > Fetching all episodes players embed:\n"));

        for (let id = 0; id < episodesURL.length; id++) {
            const url = episodesURL[id];
            const embedLink = await scrapVideoPlayer(browser, url);
            if (openLink && typeof embedLink === "string") {
                await open(embedLink);
            }
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
