# HiPiler

![HiPiler's interface](teaser.png?raw=true)

> An interactive web application for exploring and visualizing regions-of-interest in large genome interaction matrices.

[![Build Status](https://img.shields.io/travis/flekschas/hipiler/master.svg)](https://travis-ci.org/flekschas/hipiler)
[![bioRxiv](https://img.shields.io/badge/bioRxiv-10.1101%2F123588-red.svg?colorB=ae353b)](http://biorxiv.org/content/early/2017/04/03/123588)

## Get Started

#### Installation

**Prerequisite**:

- Running instance of the [HiPiler server](https://github.com/flekschas/hipiler-server)

```
git clone https://github.com/flekschas/hipiler && cd hipiler
npm install
```

#### Launch decomposition

In order to start exploring matrix snippets you have to drag-and-drop a config
JSON file onto the web application. The config file consists of two
parts: 1) snippets / fragments configuration and 2) higlass configurations.

The snippets / fragments configuration has 4 main properties:
- api: path to the server that serves Hi-C data [string]

  ```"//localhost:8000/api/v1/fragments_by_loci/"```

- apiParams: object with key-value query parameters [object]

  ```
  {
    "precision": 2,
    "dims": 22
  }
  ```

- fragmentsHeader: list of column headers for `fragments` [array]

  ```
  [
    "chrom1", "start1", "end1", "strand1",  // locus 1
    "chrom2", "start2", "end2", "strand2",  // locus 2
    "dataset", "zoomOutLevel",  // dataset info
    "size", "distance-to-diagonal", "noise", "sharpness"  // measures
  ]
  ```

- fragments: mixed array with the fragment data [2D array]

  ```
  [[
    "22", 17395000, 17400000, "coding", "22", 17535000, 17540000, "coding", "rao5kbmr", 0, 25000000, 135000, 0.21559968240959723, 58.75532055518839
  ]]```

HiGlass's config is described in detail at [higlass.io](http://higlass.io)

## Development

#### Dependencies

```bash
npm install
```

#### Commands

**Start server**:

```
npm start
```

**Build application**:

```
npm run build
```

**Test application**:

```
npm test
```
