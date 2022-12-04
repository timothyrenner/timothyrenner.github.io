+++ 
draft = false
date = 2017-08-08
title = "Finding Bigfoot with Dash, Part 1"
description = ""
slug = "bigfoot-with-dash-part-1"
authors = ["Timothy Renner"]
+++

Building a map of Bigfoot sightings with Plotly's Dash framwork.

**[Part 1: Map]({{< ref "bigfoot-with-dash-part-1.md" >}})**

_[Part 2: Plots]({{< ref "bigfoot-with-dash-part-2.md" >}})_

_[Part 3: Interactions]({{< ref "bigfoot-with-dash-part-3.md" >}})_

<br>

{{< notice warning >}}
I wrote this when Plotly Dash was brand new. Though the fundamental process and setup is the same, some of the details are quite a bit simpler now than they were when I wrote this.

In particular, the [Dash Bootstrap Components](https://dash-bootstrap-components.opensource.faculty.ai/) library replaces the manually set CSS classes and works really well. [Plotly Express](https://plotly.com/python/mapbox-layers/) makes generating the map easier too.
{{< /notice >}}

Not too long ago, Plotly announced a new open source framework for Python-based web applications called [Dash](https://plot.ly/products/dash/) ([announcement letter](https://medium.com/@plotlygraphs/introducing-dash-5ecf7191b503)).
It's a framework in the vein of R's [Shiny](https://shiny.rstudio.com/), with the key advantage being that it isn't R.
Considering my [recent efforts](https://timothyrenner.github.io/datascience/2017/06/30/finding-bigfoot.html) to make [one million dollars by finding Bigfoot](http://www.wtae.com/article/the-hunt-for-bigfoot-in-crawford-county-pennsylvania/10227215) had stalled, I figured it was as good a time as any to take this framework for a spin and try to make bank.

Here's what I want to build: an application that shows various _highly critical and important_ visualizations and statistics about sasquatch sightings, with the added ability to filter the sightings based on words I think might help me narrow down the search to relevant areas.
Here's what the final thing will look like:

<img src="{{ site.url }}/images/finding-bigfoot-with-dash/bigfoot_dash_final.png"
     style="height:100%; width:100%">

Basically it'll be four plots - a map of the geolocated sightings, a line/scatter plot of sightings over time, a bar plot of sightings by day of week, and a donut chart (_totally not_ a bar chart) of the percentage of sightings for each sighting class.
The magic will be in the search bar, which will filter the titles of the sightings based on the text you put into it.

I've broken this into three parts: the first part will load the data, make a map, and initialize the server.
The second part will be to add the additional plots with a more complex layout, and the third part will be adding the title filter bar and the associated interactions.

It's ***highly recommended*** that you read the awesome [Dash user guide](https://plot.ly/dash/) before going through this.
I'm going to assume you're familiar with the HTML and core components, specifically the graphs.
The purpose of this series of posts is to walk through a real app example rather than introduce the Dash framework itself, which the official docs already do a great job of.
I'll probably spend some time going over the plot semantics because the docs for Dash and Plotly aren't particularly consistent in that regard, but if it's obvious I'm not going to explain it.

## Setup

We're going to need some prerequisites installed.
Generally the best idea is to do this in a Python or Anaconda virtual environment.
These are the installations for Dash:

```
pip install dash
pip install dash_renderer
pip install dash_core_components
pip install dash_html_components
pip install plotly
```

In addition to those, we'll also install a couple of things that will help us with the data:

```
pip install toolz
pip install python-dotenv
```

[Toolz](http://toolz.readthedocs.io/en/latest/api.html) is probably the single most useful Python library I've used - once you get used to it, it's indispensable.
Python-dotenv is a library that makes reading `.env` files easier - we'll use it when we make the map, as Plotly's map plot requires an API key from [Mapbox](https://www.mapbox.com/).

I'll start by creating my directory like so:

```
app.py
.env
data/
```

I'll get the data, which is a geocoded list of [Bigfoot Field Researchers Organization (BFRO)](http://www.bfro.net/) verified Bigfoot sightings, from [data.world](https://data.world/timothyrenner/bfro-sightings-data) and put it in `data/bfro_report_locations.csv`.

## App Initialization

We've got the data, so it needs to be loaded into the app.
This _could_ be done with a pandas data frame, but I actually like the model of a list of dictionaries a bit better for this application.
The semantics are cleaner, and performance really isn't an issue - most of the time will be spent on the client rendering all of the plots, not filtering a 3000 element list.

```python
from csv import DictReader

fin = open('data/bfro_report_locations.csv', 'r')
reader = DictReader(fin)
BFRO_LOCATION_DATA = [
    line for line in reader
]
fin.close()
```

The sightings do have some odd times in there, so in a later post I'll go back and add a conditional to that comprehension.
For now, I'll leave it.

Initializing the app itself is basically the same as Flask.

```python
import dash

app = dash.Dash()

# Title the app.
app.title = "Bigfoot Sightings"
```

## Layout

The "front-end" components of the app - the ones that get turned into the DOM in the browser - live in the `layout` property.
Before building that out, I'll need to load a few CSS and Javascript dependencies.
Because I'm a total amateur at CSS I'm going to use [Bootstrap](http://getbootstrap.com/)'s grid system.

```python
# Boostrap CSS.
app.css.append_css({
    "external_url": "https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css"
})

# Extra Dash styling.
app.css.append_css({
    "external_url": 'https://codepen.io/chriddyp/pen/bWLwgP.css'
})

# JQuery is required for Bootstrap.
app.scripts.append_script({
    "external_url": "https://code.jquery.com/jquery-3.2.1.min.js"
})

# Bootstrap Javascript.
app.scripts.append_script({
    "external_url": "https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js"
})
```

If you want to know the details of how Bootstrap's grid system works, the [documentation](http://getbootstrap.com/css/#grid) is excellent.
Basically the only part that isn't self explanatory in this code is that columns are 12 units across, and different column classes subdivide it.

```python
import dash_html_components as html
import dash_core_components as dcc

app.layout = html.Div([
    # Column: Title + Map
    html.Div([
        # Row: Title
        html.Div([
            html.H1("Bigfoot Sightings", className="text-center")
        ], className="row"),
        # Row: Map
        html.Div([
            dcc.Graph(id="bigfoot-map")
        ], className="row")
    ], className="col-md-12")
], className="container-fluid")
```

At the moment, the layout doesn't actually have anything in it - I'll need to write a function that makes the map and modify the layout slightly once it's done.

## The Map

One of the things that makes Plotly unique is its declarative plot building semantics.
The `plotly.graph_objs` module has wrapper classes for all of the plots, but honestly I think it's a lot simpler to build them as dictionaries.
For this app, each plot's going to be built with a function that returns a dictionary that roughly looks like the following:

```python
{
    "data": [
        {
            # Data, plot type, etc.
        }
    ],
    "layout": {
        # Titles, axes, etc.
    }
}
```

Each function is going to take a list of dictionaries and return the dictionary that builds the plot.
Before we build that function we need to add our Mapbox key to the environment.
My favorite way of doing this is to use the `python-dotenv` module and put it in a `.env` file.
Obviously `.env` should _not_ be in version control.
I'll put the mapbox key in the `.env` file as follows:

```
MAPBOX_KEY=my_mapbox_key
```

Then, in the app (preferably near the top before any functions are built):

```python
from dotenv import find_dotenv, load_dotenv
import os

# Loads the dotenv file into the environment. This exposes the variables in that
# file as though they were actual environment variables to the os module.
load_dotenv(find_dotenv())

MAPBOX_KEY = os.environ.get("MAPBOX_KEY")
```

Now we're ready to make the plot building function.
It's a bit long, but it's pretty simple.
The only real action is basically a `groupby` - the rest is just populating the dict that will define the plot.

```python
from toolz import groupby, compose, pluck

# pluck returns a generator, so compose it with list to materialize it.
listpluck = compose(list, pluck)

def bigfoot_map(sightings):
    # groupby returns a dictionary mapping the values of the first field 
    # 'classification' onto a list of record dictionaries with that 
    # classification value.
    classifications = groupby('classification', sightings)
    return {
        "data": [
                {
                    "type": "scattermapbox",
                    "lat": listpluck("latitude", class_sightings),
                    "lon": listpluck("longitude", class_sightings),
                    "text": listpluck("title", class_sightings),
                    "mode": "markers",
                    "name": classification,
                    "marker": {
                        "size": 3,
                        "opacity": 1.0
                    }
                }
                for classification, class_sightings in classifications.items()
            ],
        "layout": {
            "autosize": True,
            "hovermode": "closest",
            "mapbox": {
                "accesstoken": MAPBOX_KEY,
                "bearing": 0,
                "center": {
                    "lat": 40,
                    "lon": -98.5
                },
                "pitch": 0,
                "zoom": 2,
                "style": "outdoors"
            }
        }
    }
```

The data is a list of three dictionaries - in Plotly parlance these are called "traces".
Essentially they define a group of points, in our case the grouping is done by the classification - Class A (direct sighting), Class B (indirect sighting), or Class C (hearsay, basically).
Each trace gets its own color assigned to it by Plotly.
The plot `type` is also important: `"scattermapbox"` says this is a set of points projected onto a Mapbox tiling system.
It requires "lat" and "lon" instead of x and y, which we get from using `pluck`.
That function walks over a sequence and applies some accessor (could be an index or a dictionary key) to it, returning a generator.
I composed `list` and `pluck` (pluck first, then turn the generator into a list) because Plotly needs a list, then extracted the "latitude" and "longitude" field from the sightings list with it.
I also added the title to the `text` field so we can see the titles when we hover over the points.

The Mapbox specific options are in the `mapbox` field of the layout - they're pretty self explanatory and the Plotly docs are awesome at explaining what these do, though you might need to flip to the PlotlyJS Javascript version.
As expected, the data structure described in PlotlyJS docs maps perfectly to the Python dictionary version - no need for objects.

Now that we've got our function we need to wire that into the actual layout.
Going back to the layout, we just need to add the call:

```python
app.layout = html.Div([
    # Column: Title + Map
    html.Div([
        # Row: Title
        html.Div([
            html.H1("Bigfoot Sightings", className="text-center")
        ], className="row"),
        # Row: Map
        html.Div([
            dcc.Graph(
                id="bigfoot-map",
                ############### NEW CODE #############
                figure=bigfoot_map(BFRO_LOCATION_DATA)
                ######################################    
            )
        ], className="row")
    ], className="col-md-12")
], className="container-fluid")
```

## Run It

We've got everything we need: data, layout and plot.
The final piece to get this thing up and running is to start the server.

```python
if __name__ == "__main__":
    app.run_server(debug=True)
```

After that, start it up in the shell:

```
python app.py
```

You should see that it starts a server at `localhost:8050`.
If you go there, you'll see

{{< figure src="/bigfoot-with-dash-part-1/bigfoot_dash_map_only.png" >}}

One step closer to making that million.

## Conclusion, Part 1

In this post I walked through the high level structure of a Dash app.
We read in the data, built a layout, create a plot-returning function for the map, and constructed the server.
We've still got a ways to go - check out the upcoming part 2 for a more sophisticated layout with additional plots and the upcoming part 3 for an interactive search bar. 

If you're impatient, the full source code for everything is already on [GitHub](https://github.com/timothyrenner/bigfoot-dash-app).

Head on over to [part 2]({{< ref "bigfoot-with-dash-part-2.md" >}}) and check out more plots with a more interesting layout.