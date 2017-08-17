#!/bin/sh

# Move CNAME one dir up
mv ../$1/CNAME ../__CNAME__

rm -r ../$1/*
cp -r ghp/* ../$1/

# Move CNAME back
mv ../__CNAME__ ../$1/CNAME

cd ../$1/

# Add symlinks to index.html for HTML5 History
ln -s index.html about.html
ln -s index.html docs.html
ln -s index.html explore.html
ln -s index.html 404.html

touch .nojekyll
