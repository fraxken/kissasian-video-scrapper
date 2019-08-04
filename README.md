# kissasian-video-scapper
[kissasian.ch](https://kissasian.sh/) (Asian drama streaming website). This project is an episode scrapper that will found the video player embed for each episodes for you (the site is a big pain with a lot of pubs, useless capcha, and you have to made few clicks to found the real embed link on **mp** player... others are locked).

## Requirements
- [Node.js](https://nodejs.org/en/) version 12 or higher

## Getting Started

This package is available in the Node Package Repository and can be easily installed with [npm](https://docs.npmjs.com/getting-started/what-is-npm) or [yarn](https://yarnpkg.com).

```bash
$ npm i kissasian -g
```

## Usage example

To fetch episode **1** and **2** of the Father-is-Strange drama. Episodes must be seperated by a comma `,`.
```bash
$ kissasian Father-is-Strange -e 1,2
# or fetch only one episode
$ kissasian Father-is-Strange -e 3
```

It's possible to fetch all episodes (just omit `--episode` option):
```bash
$ kissasian Father-is-Strange
```

## License
MIT
