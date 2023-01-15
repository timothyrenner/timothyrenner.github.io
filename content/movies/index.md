---
title: "Movies"
date: 2023-01-15
draft: false
---

I watch a lot of movies, mostly horror.
About three years ago or so I started tracking them too, eventually trying to figure out what I'd do with that data once I had it.
This is what I landed on, for now.

## Years in Review

**[2020]({{< ref "movies-year-in-review/2020" >}})**

## Why would I do this?
I built out the "stack" several times, with the current version landing on a combination of Obsidian for the UI (I don't do front ends), Golang for the backend, SQLite for the "application" data store, and DuckDB + DBT for the "data warehouse".

I learned a lot building out the tech stack this way.
It's basically a CRUD app without the API layer at this point, with DBT / DuckDB serving as a "data warehouse".
I think there's a lot of potential in local-first tools like SQLite and DuckDB (for example - do you really need reverse ETL when you can literally ship your warehouse to your app directly?).
It's good to have a project to iterate on and learn the boundaries of using those for a stack.

This page links to a few "Year in Review" pages I made with charts and other fun stuff.
The charts were built in code with Altair / Vega-Lite, then I added the wistful reminiscing of my adventures in the dumpsters of cinema myself.



## Repo Links

**Movie App Repo**: https://github.com/timothyrenner/movies-app

**Movie "Warehouse" Repo**: https://github.com/timothyrenner/movies-analysis
