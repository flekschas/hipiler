#!/bin/sh

# Move CNAME one dir up
mv ../$1/CNAME ../__CNAME__
mv ../$1/sitemap.xml ../__sitemap.xml__

rm -r ../$1/*
cp -r ghp/* ../$1/

# Move CNAME back
mv ../__CNAME__ ../$1/CNAME
mv ../__sitemap.xml__ ../$1/sitemap.xml

cd ../$1/

# Add symlinks to index.html for HTML5 History
ln -s index.html about.html
ln -s index.html configurator.html
ln -s index.html docs.html
ln -s index.html explore.html
ln -s index.html 404.html

touch .nojekyll
