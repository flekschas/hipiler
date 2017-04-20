#!/bin/sh

rm -r ../$1/*
cp -r assets ../$1/
cp -r dist ../$1/
cp config.json ../$1/
cp favicon.ico ../$1/
cp index.html ../$1/
