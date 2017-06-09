# HiPiler

![HiPiler's interface](teaser.png?raw=true)

> An interactive web application for exploring and visualizing regions-of-interest in large genome interaction matrices.

[![Build Status](https://img.shields.io/travis/flekschas/hipiler/master.svg?colorB=6357ff)](https://travis-ci.org/flekschas/hipiler)
[![Demo](https://img.shields.io/badge/demo-running-red.svg?colorB=f25100)](https://flekschas.github.io/hipiler)
[![Video](https://img.shields.io/badge/video-awesome-red.svg?colorB=f25100)](https://youtu.be/qoLqje5OYKg)
[![bioRxiv](https://img.shields.io/badge/bioRxiv-10.1101%2F123588-red.svg?colorB=f25100)](http://biorxiv.org/content/early/2017/04/03/123588)

## Introduction

HiPiler is an interactive web application for exploring and visualizing many regions-of-interest in large genome interaction matrices. Genome interaction matrices approximate the physical distance of pairs of genomic regions to each other and can contain up to 3 million rows and columns. Traditional matrix aggregation or pan-and-zoom interfaces largely fail in supporting search, inspection, and comparison of local regions-of-interest. HiPiler represents regions-of-interest as thumbnail-like snippets. Snippets can be laid out automatically based on their data and meta attributes. They are linked back to the matrix and can be explored interactively.

## Get Started

**Live demo**: [https://flekschas.github.io/hipiler](https://flekschas.github.io/hipiler)

**Video introduction**: [https://youtu.be/qoLqje5OYKg](https://youtu.be/qoLqje5OYKg)

**User documentation**: [https://github.com/flekschas/hipiler/wiki](https://github.com/flekschas/hipiler/wiki)

## Development

#### Dependencies

```bash
npm install
```

#### Commands

**Start developmental server**:

```
npm start
```

**Build application**:

```
npm run build
```

**Update to latest code**:

```
npm run update
```

#### Config

For custom settings copy `config.json`...

```
cp config.json config.local.json
```

...and adjust `config.local.json` to your liking.

Dynamic changes of the config are not supported yet. The dev server needs to be resarted to inline the new configuration.
