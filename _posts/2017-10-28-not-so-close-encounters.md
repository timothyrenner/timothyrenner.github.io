---
title: "Not So Close Encounters"
tags: python notebook geo
categories: datascience
layout: post
---

For as long as humans have existed there have been things in the sky that we've been unable to explain.
That list has gotten a lot smaller with certain inventions such as science, but there is still a fair amount out there we don't understand.
Some of that stuff we don't understand is esoteric, like dark matter and dark energy.
Some of it's a little closer to home.
People still see things in the sky they can't explain all the time.
Generally these types of things are pretty anecdotal, but get enough people to describe the same thing at the same time, or in the same place and you're looking at something that can't be so easily dismissed.

Recently I compiled and geocoded a collection of UFO sightings from the National UFO Reporting Center ([NUFORC](http://www.nuforc.org/)).
I made the data available on [data.world](https://data.world/timothyrenner/ufo-sightings) and put the code to get the data on [GitHub](https://github.com/timothyrenner/nuforc_sightings_data).
With this data and more I'll be able to look into a few basic questions about UFOs:
1. why are certain areas prone to UFO sightings?
2. when are UFOs seen throughout the year?
3. when were there highly corroborated UFO incidents?

<img src="http://1.bp.blogspot.com/-fOF1t2r7Fgk/TcW01yvCVrI/AAAAAAAAAA0/ttSOxTge3F8/s1600/ufo.jpg" style="height:75%; width:75%">

As a first step I'm going to plot them on a map so I can get a feel for where these occur the most often and see if there are any obvious patterns.

{% include code-panel-open.html panel_id="one" %}
{% highlight python %}
import datadotworld

ufo_sightings_dataset = datadotworld.load_dataset(
    'timothyrenner/ufo-sightings'
)

ufo_sightings = \
    ufo_sightings_dataset\
        .dataframes['nuforc_reports']\
        .rename(columns={"shape": "reported_shape"})\
        .drop('city_location', axis=1)

{% endhighlight %}
{% include code-panel-close.html %}

When I constructed this dataset, I was unable to geocode all of the reports due to messy or ambiguous names in the "city" field.
 Because of this I'll be removing any sightings that aren't geocoded.

{% include code-panel-open.html panel_id="two" %}
{% highlight python %}
non_coded_reports = ufo_sightings.city_longitude.isnull()
ufo_sightings = ufo_sightings.loc[~non_coded_reports,:]
{% endhighlight %}
{% include code-panel-close.html %}

This leaves us just over 89,000 geocoded sightings to work with.

The geocoding itself was done at the city level, so every sighting with the same city / state combination has exactly the same latitude and longitude.
This isn't a particularly realistic representation so I'm going to jitter the locations by putting random numbers on the latitude and longitude values.
This will spread the sightings around the city points, while still keeping the center point at the city itself.

{% include code-panel-open.html panel_id="three" %}
{% highlight python %}
import numpy as np

EARTH_RADIUS = 6371.0
std_dev_km = 5.0
num_sightings = ufo_sightings.shape[0]

# Jitter the latitudes and longitudes with a random normal with standard 
# deviations at 5 kilometers. This is definitely _not_ the most studious way to 
# perform the jitter because the standard deviation has a systematic bias due to
# the coordinate system, but it's not the worst thing in the world.
ufo_sightings.loc[:,'latitude'] = np.random.normal(
    ufo_sightings.loc[:,'city_latitude'], 
    std_dev_km / EARTH_RADIUS, 
    num_sightings
)
ufo_sightings.loc[:,'longitude'] = np.random.normal(
    ufo_sightings.loc[:,'city_longitude'],
    std_dev_km / EARTH_RADIUS,
    num_sightings
)
{% endhighlight %}
{% include code-panel-close.html %}

Finally, before plotting these on a map I'm going to isolate the sightings to those that occur within the continental US.
This means excluding Alaska, Hawaii, Puerto Rico, the US Virgin Islands, Guam, American Samoa, and other US territories.

{% include code-panel-open.html panel_id="four" %}
{% highlight python %}
import geopandas as gpd
from shapely.geometry import MultiPoint

# Convert the sightings to a geo data frame.
ufo_sightings_geo = gpd.GeoDataFrame(
    ufo_sightings,
    geometry=list(MultiPoint(
        ufo_sightings.loc[:,['longitude','latitude']].values)
    ),
    crs={"init": "EPSG:4326"}
)

usa = gpd.read_file('data/external/cb_2016_us_state_500k.shp')
# Remove non-continental US states.
usa = usa[~usa.STUSPS.isin(['VI', 'AK', 'HI', 'PR', 'GU', 'MP', 'AS'])]
sightings_conus = ufo_sightings_geo.state.isin(usa.STUSPS)

ufo_sightings_geo = ufo_sightings_geo.loc[sightings_conus,:]
{% endhighlight %}
{% include code-panel-close.html %}

Now it's time to get the first look at the sightings.

{% include code-panel-open.html panel_id="five" %}
{% highlight python %}
import geoplot as gplt
import matplotlib.pyplot as plt
%matplotlib inline

# Albers Equal Area is pretty standard for US projections.
proj = gplt.crs.AlbersEqualArea(central_longitude=-98, central_latitude=39.5)

# For some weirdo reason I have to set the ylim manually.
# Reference: http://www.residentmar.io/geoplot/examples/usa-city-elevations.html
ylim = (-1647757.3894385984, 1457718.4893930717)

fig,ax = plt.subplots(subplot_kw={'projection':proj}, figsize=(16,12))
gplt.polyplot(usa, projection=proj,
                   ax=ax,
                   linewidth=0.5,
                   facecolor='lightgray',
                   alpha=0.1)
gplt.pointplot(ufo_sightings_geo, 
               ax=ax, 
               projection=proj, 
               s=0.75,
               alpha=0.25,
               legend=True,
               legend_values=[0, 10, 100, 1000],
               legend_kwargs={'loc':'lower right'})
ax.set_ylim(ylim)
ax.set_title("UFO Sightings in the United States")
plt.show()
{% endhighlight %}
{% include code-panel-close.html %}


<img src="{{ site.url }}/images/not-so-close-encounters/ufo_sighting_map.png" style="height:100%; width:100%">


Aside from being a pretty cool looking map, there are a couple of pretty clear patterns here.
The sightings seem to be focused into areas with a high population density, which shouldn't be surprising.
The more people there are, the more people present that can report UFOs.
Overall, New England appears to have the highest concentration, with other high-volume areas in southern California, the San Francisco Bay Area, and Pacific Northwest.
Note also that there is an abnormal amount of activity in the Chicago area.
This will come up again later.

**Technical Note**: One word of caution on this map: it's visually oversaturated.
That means the concentration of the points in high density areas isn't correctly represented by just stacking points, which is how the low / medium density areas are represented.
There are more sophisticated plotting libraries that properly deal with this problem - specifically, [datashader](http://datashader.readthedocs.io/en/latest/index.html).
I haven't put in the time to get it to play nice with the plotting library I'm using ([geoplot](http://www.residentmar.io/geoplot/index.html)), but it's worth noting there are good solutions out there.

It's pretty clear these sightings aren't uniformly distributed, but is there a particular reason some areas are highly concentrated?
Well I already mentioned population, but that's _too_ obvious (... and boring).
There has to be more going on here.
A much more interesting (perhaps not much more important) thing to look at would be proximity to United States Air Force bases.
With a pretty small amount of effort I was able to scrape the locations of US military bases from the map on [militarybases.com](https://militarybases.com/).
I went ahead and isolated the bases to US Air Force, but the military bases dataset does have locations for all branches of the military.

{% include code-panel-open.html panel_id="six" %}
{% highlight python %}
import pandas as pd
bases = pd.read_csv('data/external/military_bases.csv')

air_force_bases = \
    bases[bases.branch == 'Air Force']\
    [['branch','latitude','longitude']]\
    .drop_duplicates()\
    .reset_index()\
    .drop('index',axis=1)
{% endhighlight %}
{% include code-panel-close.html %}

So to figure out how many sightings are in close proximity we need to do three things:

1. decide what "close proximity" is,
2. draw a circle around the Air Force bases, and
3. figure out how many UFO sightings happened within the circles.

Now this does disregard certain subtleties like _when_ the bases were established vs the time of sightings, but most of the sightings occurred [after 1998 or so](https://data.world/timothyrenner/ufo-sighting-basics/insights/014547c9-4653-4467-8b26-c10d4e21eeed), so it's probably not a severe approximation.


{% include code-panel-open.html panel_id="seven" %}
{% highlight python %}
import pyproj
from toolz import curry
from shapely.ops import transform

# In order to draw a buffer properly I'll need to apply a map projection.
# This is because, unfortunately, the earth isn't flat.
# OR - if it is - we're doing "meters" wrong.
def geographic_buffer(geometry, distance):
    
    # In general picking a map projection amounts to picking the least worst solution.
    # One fairly standard approach is to perform a universal transverse mercator (UTM)
    # projection. The standard definition divides these into zones, but it's easy to
    # recenter the central meridian at the centroid of the geometry (in this case the
    # AF base) and perform the projection there to minimize distance distortion.
    # The lon_0 keyword argument sets the central meridian. Note longitude is x.
    utm = pyproj.Proj(
        proj='utm',
        ellps='WGS84',
        lon_0=geometry.centroid.x
    )
    lonlat = pyproj.Proj(init='EPSG:4326')
    
    utm2lonlat = curry(pyproj.transform)(utm,lonlat)
    lonlat2utm = curry(pyproj.transform)(lonlat,utm)
    
    # First, put the geometry into UTM.
    geometry_utm = transform(lonlat2utm, geometry)
    # Draw the buffer in UTM coordinates, with meters as the units.
    geometry_utm_buffered = geometry_utm.buffer(distance*1000)
    # Transform back into lon/lat.
    geometry_buffered = transform(utm2lonlat, geometry_utm_buffered)
    
    return geometry_buffered

from shapely.geometry import Point

air_force_base_vicinities = [
    geographic_buffer(Point(row.longitude, row.latitude), 150.0)
    for _,row in air_force_bases.iterrows()
]

air_force_bases_geo = gpd.GeoDataFrame(
    air_force_bases,
    geometry=air_force_base_vicinities,
    crs={"init": "EPSG:4326"}
)

# Isolate the rows that are inside the continental US.
air_force_bases_geo = \
    air_force_bases_geo[
        air_force_bases_geo.intersects(usa.geometry.cascaded_union)
    ]
{% endhighlight %}
{% include code-panel-close.html %}

Let's take a quick look at the map again, this time with the Air Force bases added.
I've drawn the circles at 150 kilometers from the locations of the bases, which is just under 90 miles.

{% include code-panel-open.html panel_id="eight" %}
{% highlight python %}
# Albers Equal Area is pretty standard for US projections.
proj = gplt.crs.AlbersEqualArea(central_longitude=-98, central_latitude=39.5)

# For some weirdo reason I have to set the ylim manually.
# Reference: http://www.residentmar.io/geoplot/examples/usa-city-elevations.html
fig,ax = plt.subplots(subplot_kw={'projection':proj}, figsize=(16,12))

ylim = (-1647757.3894385984, 1457718.4893930717)
gplt.polyplot(
    usa, 
    projection=proj,
    ax=ax,
    linewidth=0.5,
    facecolor='lightgray',
    alpha=0.1
)
gplt.pointplot(
    ufo_sightings_geo, 
    ax=ax, 
    projection=proj, 
    s=0.75,
    alpha=0.5
)
gplt.polyplot(
    air_force_bases_geo,
    ax=ax, 
    projection=proj, 
    linewidth=0.5,
    facecolor='none',
    edgecolor='red'
)
ax.set_ylim(ylim)
ax.set_title("UFO Sightings in the United States")
plt.show()
{% endhighlight %}
{% include code-panel-close.html %}

<img src="{{ site.url }}/images/not-so-close-encounters/ufo_sighting_with_air_force_bases_map.png" style="width:100%; height:100%">

That's pretty telling already.
Check out Colorado: the line of bases almost exactly follows the clusters of sightings.
It's pretty obvious in the midwest as well - groups of sightings in Kansas and Nebraska are almost perfectly centered within the circles.
Is it _really_ just that the bases are in population centers, or is there more going on here?

Let's count how many of the sightings are near Air Force bases.

{% include code-panel-open.html panel_id="nine" %}
{% highlight python %}
sightings_near_air_force_bases = ufo_sightings_geo.intersects(
    air_force_bases_geo.geometry.cascaded_union
)

print(
    "Percent of UFO sightings near Air Force bases: {:.4f}.".format(
        ufo_sightings_geo[sightings_near_air_force_bases].shape[0] / \
        ufo_sightings_geo.shape[0]
    )
)
{% endhighlight %}
{% include code-panel-close.html %}

    Percent of UFO sightings near Air Force bases: 0.6274.


Just over 62% of the UFO sightings in the dataset occur within 150 kilometers of an Air Force base.
Well I think I can safely and unscientifically declare a substantial number of these solved.

<img src="{{ site.url }}/images/not-so-close-encounters/air_force.jpg" style="width:60%; height:60%">

You're welcome.

Well now we have a sort-of correlating factor for at least some of the varying geographic density.
Is there a similar pattern that pops out when we look at the sightings by day?

{% include code-panel-open.html panel_id="ten" %}
{% highlight python %}
# Add the date of the sighting.
ufo_sightings_geo.loc[:,'date'] = \
    gpd.pd.to_datetime(ufo_sightings_geo.date_time).dt.to_period("D")

sightings_by_day = \
    ufo_sightings_geo\
        .groupby('date')\
        .agg({'report_link':'count'})\
        .rename(columns={'report_link':'report_count'})

sightings_by_day.loc[:,'day_of_year'] = sightings_by_day.index.dayofyear

sightings_by_day_of_year = \
    sightings_by_day\
        .groupby('day_of_year')\
        .agg({'report_count':'sum'})\
        .reset_index()

import seaborn as sns

sns.set_style('darkgrid')
sns.set_context("notebook")

fig,ax = plt.subplots(figsize=(15,9))

ax.plot(
    sightings_by_day_of_year.day_of_year.values,
    sightings_by_day_of_year.report_count
)

ax.set_title(
    "UFO Sightings by Day of Year", 
    fontsize=20, 
    fontweight="bold"
)
ax.set_xlabel(
    "Day of Year",
    fontsize=18
)
ax.set_ylabel(
    "Number of UFO Sightings",
    fontsize=18
)

ax.annotate(
    "Guess what day this is.",
    xy=(185, 1353),
    xytext=(215, 1353),
    arrowprops={
        "facecolor": "black",
        "shrink": 0.15
    },
    verticalalignment="center",
    fontsize=15,
    fontweight="bold"
)

ax.tick_params(labelsize=12, which='both')

plt.show()
{% endhighlight %}
{% include code-panel-close.html %}

<img src="{{ site.url }}/images/not-so-close-encounters/ufo_sighting_by_day_of_year.png" style="height:100%; width:100%">

Okay so a lot of sightings occur on the fourth of July, and a lot of sightings occur near Air Force bases, but what about specific events?
Is it possible to correlate sightings both spatially _and_ temporally to see if we can find a reasonable number of reports that are all pointing to the same object?
I'll tackle this one in two parts: first I need to spatially segment the sightings.
I _could_ just group by city, but a lot of the "cities" are actually more like suburbs, so they're pretty close together.
An object flying through the sky would be visible across several cities, and the farther it flies the more likely it is to be spotted in more than one city.

Better than looking at the individual city level would be to find groups of closely packed sightings based on location, then within those groups look for sightings on the same day.
We can find these groups of sightings using a clustering algorithm, which automatically groups the sightings based on their location and geographic density.
The particular algorithm I'll use is called [HDBSCAN](https://hdbscan.readthedocs.io/en/latest/).
I'm not going into the details about how it works but it is very well suited to clustering this dataset based on the breadth of total area and the highly varying density of the points.

{% include code-panel-open.html panel_id="eleven" %}
{% highlight python %}
import hdbscan

ufo_sighting_coordinates = np.radians(
    ufo_sightings_geo.loc[:,['latitude', 'longitude']].values
)

clusterer = hdbscan.HDBSCAN(
    min_cluster_size=50, 
    min_samples=1, 
    metric="haversine", 
    cluster_selection_method='leaf'
)

# This will take a while.
ufo_sightings_geo.loc[:,'cluster_label'] = \
    clusterer.fit_predict(ufo_sighting_coordinates)

print(
    "Total number of clusters: {}.".format(
        ufo_sightings_geo.cluster_label.max()
    )
)
{% endhighlight %}
{% include code-panel-close.html %}

    Total number of clusters: 571.


The algorithm itself only assigns labels to points - all we need to do to get a look at the concentrated sighting areas is to draw shapes around them.


{% include code-panel-open.html panel_id="twelve" %}
{% highlight python %}
cluster_polygons = \
    [
        MultiPoint(group.loc[:,['longitude', 'latitude']].values).convex_hull
        for label,group in ufo_sightings_geo.groupby('cluster_label')
        if label != -1
    ]
{% endhighlight %}
{% include code-panel-close.html %}

Okay, here's what the sightings look like with the dense areas overlaid.

{% include code-panel-open.html panel_id="thirteen" %}
{% highlight python %}
# Albers Equal Area is pretty standard for US projections.
proj = gplt.crs.AlbersEqualArea(central_longitude=-98, central_latitude=39.5)

# For some weirdo reason I have to set the ylim manually.
# Reference: http://www.residentmar.io/geoplot/examples/usa-city-elevations.html
fig,ax = plt.subplots(subplot_kw={'projection':proj}, figsize=(16,12))

ylim = (-1647757.3894385984, 1457718.4893930717)
gplt.polyplot(
    usa, 
    projection=proj,
    ax=ax,
    linewidth=0.5,
    facecolor='lightgray',
    alpha=0.1
)
gplt.polyplot(
    gpd.GeoSeries(
        [p for p in cluster_polygons if p.type == "Polygon"], 
        crs={"init": "EPSG:4326"}
    ),
    ax=ax,
    projection=proj,
    linewidth=0.5,
    facecolor='red',
    alpha=0.3
)
gplt.pointplot(
    ufo_sightings_geo, 
    ax=ax, 
    projection=proj, 
    s=0.75,
    alpha=0.5
)
ax.set_ylim(ylim)
ax.set_title("UFO Sightings in the United States")
plt.show()
{% endhighlight %}
{% include code-panel-close.html %}

<img src="{{ site.url }}/images/not-so-close-encounters/ufo_sighting_with_clusters.png" style="height:100%;width:100%">

It looks like the clustering is solid.
Even the really dense areas have clusters, but it's hard to see them because they're pretty small.

The next step is to group the sightings by the clusters.
Then we'll be able to see which clusters contain multiple sightings on the same day.

Now's the part where I put on my tin foil hat and embark on some grandiose theory that relates the UFOs to the military bases to what's clearly a government cover up for distributing autism causing vaccines through chemical trails but just at night to get you ready to squint really hard at the data to make it _seem_ like a group of reports is all describing the same thing.

But I'm not going to do that because I don't have to.

{% include code-panel-open.html panel_id="fourteen"%}
{% highlight python %}
non_outlier_sightings = ufo_sightings_geo.cluster_label != -1

same_day_cluster_sightings = gpd.pd.concat(
    [    
        cluster_sightings\
            .groupby(['cluster_label','date'])\
            .agg({'report_link':'count'})\
            .reset_index()\
            .rename(columns={'report_link':'report_count'})\
            .query('report_count>1')
        for cluster_label, cluster_sightings 
        in ufo_sightings_geo[non_outlier_sightings].groupby('cluster_label')
    ]
).sort_values('report_count', ascending=False)

same_day_cluster_sightings.head(n=10)
{% endhighlight %}
{% include code-panel-close.html %}

<div>
<table border="1" class="table table-striped">
  <thead>
    <tr style="text-align: center;">
      <th></th>
      <th>cluster_label</th>
      <th>date</th>
      <th>report_count</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>11</th>
      <td>492</td>
      <td>2004-10-31</td>
      <td>57</td>
    </tr>
    <tr>
      <th>8</th>
      <td>492</td>
      <td>2004-08-21</td>
      <td>31</td>
    </tr>
    <tr>
      <th>23</th>
      <td>458</td>
      <td>2001-01-11</td>
      <td>24</td>
    </tr>
    <tr>
      <th>11</th>
      <td>400</td>
      <td>1997-07-04</td>
      <td>14</td>
    </tr>
    <tr>
      <th>15</th>
      <td>493</td>
      <td>2005-10-01</td>
      <td>13</td>
    </tr>
    <tr>
      <th>15</th>
      <td>492</td>
      <td>2005-09-30</td>
      <td>13</td>
    </tr>
    <tr>
      <th>9</th>
      <td>402</td>
      <td>1997-07-04</td>
      <td>11</td>
    </tr>
    <tr>
      <th>15</th>
      <td>458</td>
      <td>2000-02-16</td>
      <td>10</td>
    </tr>
    <tr>
      <th>104</th>
      <td>414</td>
      <td>2008-04-16</td>
      <td>10</td>
    </tr>
    <tr>
      <th>16</th>
      <td>492</td>
      <td>2005-10-01</td>
      <td>10</td>
    </tr>
  </tbody>
</table>
</div>



On October 31st, 2004 there were _fifty seven_ reports within the same small geographic area on the same day.
These reports are collected voluntarily - it's likely thousands of people saw something that night.
_Bonus note: There are 31 sightings on August 21, 2004 in the same place (check the cluster label)._
The cluster covers a small suburb of Chicago called Tinley Park.

Here's what they saw.

{% include code-panel-open.html panel_id="fifteen" %}
{% highlight python %}
same_day = ufo_sightings_geo.date == same_day_cluster_sightings.iloc[0].date
same_cluster = ufo_sightings_geo.cluster_label == same_day_cluster_sightings.iloc[0].cluster_label
for _,row in ufo_sightings_geo[same_day & same_cluster].iloc[:10,].iterrows():
    print("{}, {} {}".format(row.city, row.state, row.date))
    print(row.text)
    print()
{% endhighlight %}
{% include code-panel-close.html %}

<div class="panel panel-default" style="max-height: 500px; overflow-y: scroll;">
    <ul class="list-group">
        <li class="list-group-item">
            <b>Tinley Park, IL 2004-10-31</b>
            3 U.F.O.'s spotted in Chicago, IL. It was around 8:00 on Halloween night. My friend called me, told me the red lights he saw had returned (previuosly posted on this sight), so i looked out side and sure enough directly above my house was 3 very bright red lights. All 3 red lights at 1st ligned up in a str8 line with exact space inbetween each other. A few minutes later the farthest red light moved northbound and then formed an L formation with the other two lights. My mother then returned inside to get her camera, when she came back outside the 3 lights had moved alot farther southbound. Still in the L formation, allmost perhaps it was a Triangle formation. Actually it was alot like a triangle formation. We took 3 pictures but they did not turn out(her camera is just a normal digital camera). soon after we took the pictures the farthest east light disapeared, just vanished instantly. the other to started 2 seperate and soon after the farthest west light vanished. That 1 however seemed like it burnt out like a fire. it was flickering then gone. the last middle one disapered in the same fashion, but again in it's own path. this all happend in about 10 - 15 minutes. the lights at 1st were about button sized in the sky and ultra bright when they were first over my house. These were Most deffinantly not some sort of Laser Light's that some 1 put in the sky. These were most deffiantly not moving like airplanes and were most definantly way higher then helicopters can go.they also made absolutly NO sound.
        </li>
        <li class="list-group-item">
            <b>Tinley Park, IL 2004-10-31</b>
            3 Bright Red Objects in South Eastern Sky that took different formations then disappeared. 3 bright red lights in sky.  Looked like three red stars.  Took Triangle formation, then L shape formation than a 90 degree formation.  Red Star to the left drifted off to the left and then the remaining two seemed to back off into space and disappear. Sighting lasted about 20 min to half hour.
        </li>
        <li class="list-group-item">
            <b>Tinley Park, IL 2004-10-31</b>
            I think this may have been man made because of the slow speed involved, like drifting in the breeze. I saw 3 bright red lights over the south side of tinley park. They arose from ground level very far off in the distance and one at a time kept going up in the sky. They were aproximatly 400 yards from each other and followed the first one exactly. the light was a very bright and rich red color that did not waver in any way as they made thier way east. The lights went up to about 7 or 800 feet in the air before leveling off. Thier speed was so slow I found myself thinking they were very large balloons that were lit up some how. I watched a commercial plane flew by and the plane was just north of them and it did not seem to affect the lights in any way. The plane made no attempt to alter it's course as it passed the three lights.
        </li>
        <li class="list-group-item">
            <b>Tinley Park, IL 2004-10-31</b>
            UFO visits in Tinley Park On October 31, 2004 I was sitting inside my house when my little brother came in the house yelling about UFOs outside. I stepped outside to see three circular shapes,  floating around. They weren't moving and you could tell they weren't airplanes. You could also see airplanes flying around them, I dont know if they where passing through or checking out the 3 UFOs. I was standing in my front yard facing LaGrange Ave watching them. They just hovered for a little bit, then they would move around, and the reconfigure. I went back inside to watch some more tv as my brothers and their friends stayed outside to continue watching them. After an hour or so I went back outside to the front yard to notice they werent there, so I went in my back yard which is towards the direction of Harlem and noticed they had moved there doing the same thing of hovering then moving around and reconfiguring. Occording to my brothers, a little bit later they just disappeared. I'm assuming it was some government/military experiment because I don't believe in UFOs but I could be wrong. ((NUFORC Note:  No time for the event was indicated by the witness.  We have assigned an approximate time for the sighting.  PD))
        </li>
        <li class="list-group-item">
            <b>Tinley Park, IL 2004-10-31</b>
            Red Lights again in Tinley Park, second sighting in two months Three soundless red lights moved very slowly eastward, mostly in a boomarang formation.  They would shift formations occasionaly, and once or twice seemed to stop completly.  One of them seemed to be on "point".  They were higher than most of the normal aircraft, but I am rather close to an airport.  It seemed a helicoptor was sent to check them out coming out of the south, but didnt really hang around or get too close to them.He just zipped north and then west. It also seemed a jet was after them from the north.  As the lights began to reach out further into the horizon the lead light sped forward, while one moved north and the other south. Then they just kinda twinkled out and were gone. Most of the event I captured on film along with many other local residents.  Over 200 calls were placed to local law enforcment.  This is the second occurence i know of in a 2 month span.
        </li>
        <li class="list-group-item">
            <b>Tinley Park, IL 2004-10-31</b>
            3 BRIGHT RED LIGHTS IN TRAINGLE FORMATION SITTING STATIONARY IN THE NIGHT SKY 3 RED LIGHTS  HIGH UP IN THE SKY HOVERING SILENTLY IN A TRIANGLE FORMATION.  AFTER 10 MINUTES ONE OF THE LIGHTS CHANGED POSITION SLIGHTLY. AFTER ABOUT 5 MINUTES MORE ONE OF THE LIGHTS MOVED AND DISSAPEARED. THE OTHER 2 BECAME OBSCURRED BY CLOUD COVER AND WERE NOT SEEN AGAIN. MOST OF THE NEIGHBORS ON OUR BLOCK CAME OUT AND WITNESSED THE LIGHTS. COULD NOT TELL THE SHAPE.  LOOKED AT THEM WITH BINOCULARS AND COULD ONLY MAKE OUT THE RED LIGHT. WITNESSES INCLUDED FIRE DEPARTMENT CAPTAIN, YOUTH PASTOR, SELF EMPLOYED PERSON, PROFESSIONAL PEOPLE.  LIGHTS LOOKED TO BE VERY HIGH IN THE SKY
        </li>
        <li class="list-group-item">
            <b>Tinley Park, IL 2004-10-31</b>
            Three red lights return to Tinley Park,Il The three red lights of Tinley Park came back as they were in August. Hovered over the Eastern sky for about 40 some minutes. Middle light moves to the left light and then returns to middle. Then just fades away.
        </li>
        <li class="list-group-item">
            <b>Tinley Park, IL 2004-10-31</b>
            3 bright red lights going into formation in the eastern sky.  First in triangle formation, then one seemed to disappear.  Then they slowly phased away. Oct 31, 2004. About 8 people witnessed this.
        </li>
        <li class="list-group-item">
            <b>Tinley Park, IL 2004-10-31</b>
            3 red lights moving slowy started in triangle and rotaed the form a spaced apart line
        </li>
        <li class="list-group-item">
            <b>Tinley Park, IL 2004-10-31</b>
            3 red lights, in triangular shape, moving very slowly ((NUFORC Note:  Witness elects to remain totally anonymous.  PD))
        </li>
    </ul>
</div>

Freaked out yet?
These people are all describing the same thing: three red lights in formation in the sky.
While it's not clear what the cause of the lights actually was, you'd have to work pretty hard to convince me all these people are making this up or embellishing something ordinary.
Enough people thought it was weird enough to report it, and we can easily assume that many many more saw them without reporting them to NUFORC because, let's be real, you probably hadn't heard of NUFORC before you started reading.
The mass sighting in August has reports of the same thing: three red lights.

Did anybody get a picture of this thing?
Oh yeah - here's a picture of them, hosted on the NUFORC site:

<img src="http://www.nuforc.org/CB103104.jpg" style="width:100%; height:100%">

"Alright Frohike hit me again." - you got it Dr. Scully.

{% include code-panel-open.html panel_id="sixteen" %}
{% highlight python %}
same_day = ufo_sightings_geo.date == same_day_cluster_sightings.iloc[2].date
same_cluster = ufo_sightings_geo.cluster_label == same_day_cluster_sightings.iloc[2].cluster_label
for _,row in ufo_sightings_geo[same_day & same_cluster].iloc[:10,].iterrows():
    print("{}, {} {}".format(row.city, row.state, row.date))
    print(row.text)
    print()
{% endhighlight %}
{% include code-panel-close.html %}

<div class="panel panel-default" style="max-height: 500px; overflow-y: scroll;">
    <ul class="list-group">
        <li class="list-group-item">
            <b>Rockford, IL 2001-01-11</b>
            Computer shuts off during light sighting in Rockford I was on the internet at 8:50 pm on Jan 11, when my computer mysteriously shut down then turned on again. This shut down coincided with a sighting of lights by many other citizens of Rockford, IL. Later that night on all three of the news stations in my town reports of light sightings were made. The light sightings were simlilar to the lights I saw in Feb 2000. About 8-11 yellow orange lights were seen. Over 600 people reported that they had seen the lights hovering in the sky. The light sightings were made from 8:50 to 9:00 pm in Rockford over East State street in the same location of previous sightings.
        </li>
        <li class="list-group-item">
            <b>Rockford, IL 2001-01-11</b>
            Formation of 10 yellowish glowing targets (night sighting) drifted SW to NE at 5-10 MPH, 1500' AGL then extinguished one at at time. Submitter/observer is a licensed commercial pilot, 4000+ hours.  Viewed approximately 10 yellowish glowing targets appearing to be small hot air balloons in formation.  Balloons are presumed to be 4' high and 3' in diameter, containing a rag soaked in fuel oil mounted on crosswires in the balloon opening.  Formation moved at 5 to 10 mph (estimated) from SW to NE.  May have been approximately 1500' AGL.  When approximately overhead, light began to extinguish, one at a time which would be consistent with fuel exhaustion. ((NUFORC Note:  We believe witness means 2100 hrs., not 2200 hrs..  We have altered the time here.  PD)) FOLLOW-UP CORRESPONDENCE:   Dear Mr. ((name deleted)) Thank you very much for the excellent report. Could I ask, how did you estimate the altitude, please?  Did you triangulate from two or more Locations?  Also, were there other witnesses with you who saw them?  That is, were you alone at the time, or were there other people standing with you, with whom you were discussing the event at the time?  Do you know what the surface winds, and winds aloft at 3 and 6 were at the time, by any chance? Did you look at the objects with binoculars, by any chance, or with the naked eye only? Finally, how did you establish what the combustible fuel was?  Is that an assumption, or were you able to identify that it was fuel oil? Thanks again for sharing the information with our Center! Cordially, Peter Davenport -- Peter B. Davenport, Director National UFO Reporting Center PO Box 45623 University Station Seattle, WA 98145 director@ufocenter.com http://www.UFOcenter.com Hotline: 206-722-3000 (From 8AM to Midnight Pacific preferred) RESPONSE Gracious, Peter.  I hardly expected to receive a "personal" reply, particularly so quickly. Well, anyway.  To address your questions. ALTITUDE The altitude was guestimated based on a hypthetical or presumed size of the targets.  In other words a 4' or 3' lighted object at approximately 1500' might appear not as a pinpoint but a larger light point, yet not as large enough to be definable as a vehicle or airship.  I realize size and distance are difficult to estimate, particularly at night when there is nothing to calibrate with.  But if you visualized a very tiny aircraft at a very high pattern altitude that would be consistent with the sighting. OTHER OBSERVERS I was with a group of 20 to 30 people.  Apparently the sighting had been going on for several minutes.  I was called outside to join the group for the last 5 to 8 minutes of the sighting.  At that time all of the points of light became extinguished.  There was much discussion and there has been much subsequent discussion.  The 3 local TV stations are collecting many observations and theories.  The sighting included perhaps 1000 or more people in the area.  There are reports of sightings from outside the local area but it is difficult for me to believe that we are all talking about the same sighting.  Numerous amateur videos exist of this particular sighting so comparison can no doubt be performed.  You may receive other reports; your web site was mentioned by one of the TV stations which is why I decided to file this report. WINDS Surface winds were calm.  I'm not sure how to obtain past observations for winds aloft.  You may be able to do that for the date/time that I specified for RFD.  I would expect winds aloft at 3,000 to somewhat correlate with what we appeared to observe, e.g. a movement from SW to NE over a period of several minutes.  Interestingly the RFD airport is located approximately 6 miles SW of the position where this observation occurred.  Direction of movement would have placed the path prior to our sighting somewhere in the vicinity of the airport.  If my theory is correct a possible point of origin would be from rural areas south of the city. BINOCULARS No binoculars or other viewing aids were available.  Sightings were unsupplemented naked eyes. FUEL SOURCE Fuel source is a hypothesis based on color and apparent behavior, e.g. yellow color, reasonably constant intensity with occasional minor flickering.  An observation that may have some significance is that the light or flame of each target appeared to diminish before it died out, one by one much as if whatever might be burning was ultimately consumed.  During the time that I observed, all targets eventually disappeared at an average of 1 minute intervals. I hope this is helpful.  It will be interesting to triangulate various reports.  All the best,  ((NAME DELETED))
        </li>
        <li class="list-group-item">
            <b>Rockford, IL 2001-01-11</b>
            You probably got this report already but if not, let me know and I will forward article from Chicago Sun Times. I did not see object but heard about it on WGN radio in Chicago and then found newspaper story next day. It was several orange globes flying in formation. Radio said Rockford ILL. police recieved over 500 calls on the 911 line. Also seen in Davenport Iowa. Rockford T.V. station took video and aired on newscast.
        </li>
        <li class="list-group-item">
            <b>Rockford, IL 2001-01-11</b>
            First thought to be an airplane, but its color, shapes, and hovering motion was unexplainable. orangish in color hovering in a southeast pattern disappearing one by one moving at slow rate of speed.
        </li>
        <li class="list-group-item">
            <b>Rockford, IL 2001-01-11</b>
            9 round objects moving independently. Orange/Yellow in color 9 round objects moving independently. Orange/yellow in color. Videotaped approx. 5 min. of sighting.
        </li>
        <li class="list-group-item">
            <b>Rockford, IL 2001-01-11</b>
            24 total golden colored, orbed lights in configurations similar to the big dipper moving slowly from NW to East Two seperate sets made of one set of 15 golden orbs in a slow moving configuration similar to the big dipper and accompanied ( believe, but other 2 companions did not seem to hear)by a low hum. Objects were moving from the north west to east.  Followed by car appx. 1/2mi, stopped car and watched objects slowly blink out of sight one by one. A second set of 9 identical color and size orbs as the first set following in same path @ appx. same speed. The night sky was clear at beginning of sightings, then begin to fog over slowly. Followed second set of orbs for another 1/2 mile.  People throughout the traveled area were watching the sight, talking on cell phones, stopping along the route to watch, even people on a city bus were looking out of windows at the objects. Observed by 51yrs. church secretary, 59yrs insurance agent and 8yrs, 3rd grade, male student. ((NUFORC Note:  We spoke briefly by telephone with this witness.  They were located near Chile's (sp?) Restaurant when they initially witnessed the objects, and were looking slightly north of east as they gazed at the lights.  Then, they drove east approximately one mile along State Street (??) to Perryville Road, where they stopped again, and continued to look at the lights in the eastern sky.  PD))
        </li>
        <li class="list-group-item">
            <b>Rockford, IL 2001-01-11</b>
            several orange lights hovering in formation. I did not witness the event but saw brief video and heard radio report and read small article...all i could find. Looking for more info. Several orange colored lights hovering in night sky over Rockford. Weather phenom? Again, i did not witness it but am having trouble getting further information. I will fill out report info but I couldn't tell you more than I already have. this was a massive display which needs investigating. ((NUFORC Note:  We presume the witness means the events over Rockford, IL, on Thursday night, January 11, 2001.  Please see other reports.  PD))
        </li>
        <li class="list-group-item">
            <b>Rockford, IL 2001-01-11</b>
            Red balls of light that change to green before they disappeared Well first off on March 14, 1995 I saw a red ball of light floating in the night sky. Before it disappeared it turned green and vanished. Well last night this strange occurance happended again, but in a much larger number. There were about 18 of these objects aloft in the night sky changing in geometrical shapes. And before the last one vanished it also changed to the color green. On the news some "experts" said that they were a result of sun eruputions. And on another channel they said it was a strange weather pattern. ((name deleted))....Age 18
        </li>
        <li class="list-group-item">
            <b>Rockford, IL 2001-01-11</b>
            13 orange lights moved steadily and at times flew closely and eventually faded away. I and several other people noticed a cluster of 4 orange balls in the sky that did not appear to be moving much around 9:10pm January 10 2001.  ((NUFORC Note:  We think is should be 11JA01.  Date indicated above is correct.  PD)) Then we saw 9 others in in 3 lines, one line of 4 balls, one of 3, and one of 2. they appeared closer and therefore larger, in relation to the first bunch. They moved at a steady pace in different directions and at times,flew very near one another. while watching these lights move, the first cluster gradually dissapeared. The second group countinued to move and at times would change light intensity. a couple seemed to stop moving, and the others behind countinued to move forward and pass up the stopped lights. They at times appeard to form shapes like a square or triangle; but it didn't look intentional. There was no sound as far as I could hear, but I was standing next to a busy road. As I continued to watch the orange shpearic shapes move through the sky they began to fade away and then come back; until some compleatly disapeard.
        </li>
        <li class="list-group-item">
            <b>Rockford, IL 2001-01-11</b>
            A number of orange/yellow lights appeared and began moving erratically in two groups. At approximately 9:15pm (CST) a number of orange/yellow lights appeared in the sky in eastern Rockford.  I first saw a group of 7 that were moving slowly, but not falling -- they were moving laterally.  After a few minutes, a number of Rockford residents (hundreds) had pulled off the side of the road to watch the phenomenon.  There was also a second group of about 18 circles that appeared and began moving east.  Our local police department had over 100 calls, and the local news and TV media still have not determined what caused the lights. The lights were just below cloud level (which was high that night). ((NUFORC Note:  We believe the correct date should be 11JA01.  PD))
        </li>
    </ul>
</div>

Rockford, IL 2001: over 20 people reported (far more probably saw) 10 or so yellow / orange lights in the sky, flying in some non-random formation.
I googled around a little bit but couldn't find much about this specific sighting, but I did learn that UFO sightings aren't all that uncommon in the Rockford area either.
It's only about 2 hours away from Tinley Park.
I'd also like to point out that Tinley Park and Rockford sightings are _not_ in the vicinity of a nearby Air Force base.
Check the map plot with the Air Force bases if you don't believe me.

Oh and yes I can keep going Agent Mulder:

{% include code-panel-open.html panel_id="seventeen" %}
{% highlight python %}
same_day = pd.PeriodIndex(ufo_sightings_geo.date) == pd.to_datetime('1997-03-13')
same_city = ufo_sightings_geo.city == "Phoenix"

for _,row in ufo_sightings_geo[same_day & same_city].iloc[:10,].iterrows():
    print("{}, {} {}".format(row.city, row.state, row.date))
    print(row.text)
    print()
{% endhighlight %}
{% include code-panel-close.html %}

<div class="panel panel-default" style="max-height: 500px; overflow-y: scroll;">
    <ul class="list-group">
        <li class="list-group-item">
            <b>Phoenix, AZ 1997-03-13</b>
            Summary : "V" shaped black object with 5 lights, passed directlyover our house in Phoenix and didn't make a sound. It's shape was that of a carpenter's square set at about 60 degrees, each arm about 300 feet long. My 10 year old son and I had just arrived hope about 8pm and as he waited in the car for me to come around and open the door, he was looking towards the Northwest to see if the comet might still be visible, when he saw a grouping of lights. I looked and what I saw was what looked like at first a pattern of 5 lights in a half oval on its up side. I thought it was a blimp with lights on it. It seemed to be floating but I noticed it was coming directly in our direction. My son went in the house and got my wife, my 13 year old grandson and my 18 year old daughter, to come outside. We all watched these lights approach. Whatever it was it was moving rather slowly. As it came close it no longer had an up-oval shape, but began to look more lie a "V" of 5 lights, with one light in the center lead point and two lights on each side. The angle of the "V" was not very sharp, maybe 60 degrees.As we stood there watching we were completely flabergasted because it was going to pass directly over our house.  And it did. It passed directly over head maybe a thousand or so feet overhead. Our house is up on the side of a mountain in the Northeast part of Phoenix and we can see pretty far to the northwest and southwest. When it passed overhead we all were looking at it and talking. For one thing, it seemed to float over us and it made absolutely no detectable sound at all.  We were trying to imagine what it was. It certainly couldn't be a group of aircraft flying in formation, because the lights remained absolutely fixed in relationship with each other. As we looked up we could see through the middle of the "V" but each arm seemed to be flat shaped like a ruler, and rather long from the first lead light to the tip lights, maybe a couple of hundred feet or more. It was huge.The kids got a little frightened, I suppose because we had no explanation for what we were seeing. We watched it continue to fly towards the southeast until we no longer could see any lights.My background: I am 54 years old, in perfect health. I have a Masters Degree from Columbia University Teacher's College. Formerly worked for IBM as a systems engineer. More recently worked in the electronics repair industry in management. Presently executive in a manufacturing firm. My wife is a secretary at St Mary's Catholic High School. My one daughter is an honor student at the High School. We live up on the side of this mountain and are always looking at the sky, so if we're outside not much is going to go by without us seeing it. And we all have never seen anything like this.
        </li>
        <li class="list-group-item">    
            <b>Phoenix, AZ 1997-03-13</b>
            Summary : 5 orange colored lights fall toward earth like fireworks.  Shortly after they hovered in place, pulsating and began moving at odd trajectories.  They did this for several minutes, blinking in and out.  Moments later, they had vanished from view. Driving Northbound on West I-10, from the Chandler Blvd exit, Miles looked out the car windshield and noticed the objects positioned at one o'clock. As they were falling, I noticed five objects, three with sparks coming off of them.  Then I got Demian's attention and we both witnessed them stop above the horizon of the city lights, hover, and began pulsating.  Two, started moving independantly of the others at various right angles and spiral motions, while the others maintained a steady pattern.By this point we had passed the Elliot Rd. offramp and were proceeding toward the Superstition Freeway.  By the time we had crossed beneath the Guadalupe Rd. overpass, they had vanished from sight.  From our assumption, they appeared to be East of Sky Harbor by a few miles, somewhere over Tempe.There is not a dought in our minds that this unexplained phenominon is indeed explainable.  For the record, this report was typed prior to reviewing the posted repots..
        </li>
        <li class="list-group-item">
            <b>Phoenix, AZ 1997-03-13</b>
            Summary : Sighted red to white horizontal line on the north west horizon. As the object got closer it looked like a 5 light triangle. It passed over head and diasppeared into the south east horizon in about 10 to 15 minutes. The object was first spoted by ((name deleted)) at approximately 2015 on 3/13/97.  The object was seen on the northwestern horizon.  It appeared as a horizontal line with a red glow.  We arrived home and got some binoculars to see what it was.By this time it had changed color to a brilliant white and was in the shape of a triangle.  The best discription at this time was the leading edge of the B2 bomber.  A light on the nose, one on either side and toward the back, then one moreon either side spaced farther back than the first pair.  There were five lights in all.  The object moved from the northwest to the southeast, almost directly over head of our house.  As it moved across the sky is believe I was able to seethe stars between the light formation.  We tried to hear a sound from the objects, thinking it might be helicopters flying in formation, but there was no strobe or red and green marker lights.  The formation of the five objects did not changeas you would expect from aircraft.  There was no change in spacing, no noise and it was as bright overhead as it was comming or going.  We could not tell how high the objects were, but while discussing what we saw the next day we realized thatwe might have see these objects while they were over Prescott because they started out red then changed to white while over Phoenix.  We do not have any explanation for what we saw, but we both saw something we've never seen before.
        </li>
        <li class="list-group-item">
            <b>Phoenix, AZ 1997-03-13</b>
            From North to South over Camelback mountain High in the Arizona sky Hundreds of citizens see a phenomena of lights Soundlessly, slowly pass by Uniform in motion and in V formation The appearance was that of one mass And yet from directly under; more like five individual beacons, encased in spheres of fine glass Was it our "Dark Star" with a cloaking device or estraterrestials offering celestial advice? "The truth is out there" and one day we'll know This verse is just to chronicle the event For History.......On with the show! My mother and I were on our balcony which faces north to Camelback mountain.  At approximately eight o'clock I observed five spherical lights the length of a football field floating towards us. My mother said "What ARE you looking at?" Mom, I said,  "LOOK AT THIS;  THERE IS NO SOUND!"  Both of us were in awe as we KNOW the difference between ordinary aircraft and what we were looking at. She, the widow of an Air Force war correspondent and myself having logged MANY air miles as a flight attendant/travel agent/international tour guide. When it was reported as "flares" my comment to her was "NOW you know why I didn't notify anyone!" What I did do was write the verse and commission an artist friend of mine who painted a 3 foot by 9 foot oil on canvass of the lights with camelback mountain in the background.  It is almost as awe-inspiring as the event itself.  Prints are available if inter- ested.  If I had been online and known of this website on March 13, 1997; not only would I have reported it immediately but I might have saved myself the grief of wondering about a temporary tenuous grip on reality!  Thank you for maintaining this website for everyone concerned.
        </li>
        <li class="list-group-item">
            <b>Phoenix, AZ 1997-03-13</b>
            Summary : Phoenix UFO sighting March 13, 1997 My wife and I were standing out front while she was smoking. We always look in the sky when were outside at night and I had just went in the house and sat down at the computer. I didn't even touch the keyboard when she was hysterically yelling for me to come outside.  I ran outside as quickly as I could because I thought there was something happening to her. She pointed into the sky and told me to look at these lights.  It was clearly obvious that it was a craft of some sort. We could see the area between the lights which had a tiangular shape, was solid and was a different shade (darker) of black than the night sky.  It moved towards Sky Harbor airport as it moved away from us. It made no noise as it went by.We are in the flight path of Sky Harbor and look at the planes as they go over (about 5000 feet).  In comparison, you could of lined 3-4 jet airliners end to end and hung them underneath this thingI was an aircraft maintenance specialist in the Air Force working on B-52's, KC135's, C-5's, and C141 aircraft. I have hundreds of flying ours with about a hundred of those in hostile airspace over Vietnam.I also spent 3 years in the Army Special Forces (Green Berets) as a light weapons specialist, a nuclear, biological, chemical warfare specialist.  I am  a certified Quality Assurance Specialist in Electronic and Software commodities for the Department of Defense and I am presently working as a Software Quality Engineer for Honeywell. I have an A.S. degree in Quality Assurance and a Bachelors degree in Management.My wife is a Network Specialist for the Arizona State Internal Revenue Service.  She has an A.S. degree in Law and is working on her Bachelors degree in Information Systems.
        </li>
        <li class="list-group-item">
            <b>Phoenix, AZ 1997-03-13</b>
            Summary : Unexplained Arizona Sighting At approximately 8:45PM I went the front yard of my Phoenix home which is located in the southern part of the city, an area called Ahwatukee. I looked to the east and saw a very strange looking craft flying (?) very slowly in the sky. It was moving away I assume as it was getting smaller. It was very visible against the Superstition Mountains. It moved slowly from north to south and back again in what appeared to be a ric-rac pattern. It was quite large, I agree with the others who put their arm up and measured with a closed fist. It appeared triangular in shape, I related it to a "squashed" pyramid. I saw three very bright white lights, one in each corner and one at the top of the  "pyramid".  In the center was a very, very bright pulsating red light, bigger in circumference than the three white lights. I would describe the white lights as three powerful strobe lights. We watched the object for several minutes and we amazed that something that large could move so gracefully! and so silently. We could hear no sound at all. It gradually faded into the south east sky.
        </li>
        <li class="list-group-item">
            <b>Phoenix, AZ 1997-03-13</b>
            An object, consisting of 5 lights, in the shape of an arrow, flew right over my house. I was on my way to the store, when I looked up and saw 5 white lights, appearing to be equally spaced, in the shape of a wide arrowhead.  The lights were coming over a mountain, to the north of my house, that is used for hang gliding. That was my first thought, a hang glider strung with lights.  But the lights were bright enough to show that they were not attached to a hang glider frame. A friend was coming to my house the same time I was leaving, so I pointed the lights out to him.  On my way to the store, I noticed my neighbers outside also watching the lights.  I stopped to talk to them about it, and we all came to the conclusion that what we were seeing was a UFO. The object didn't emit any sound, and flew from north to south.  I first noticed it above Shaw Butte Mountain (15th Ave. and Cholla) and last saw it around 13th Ave. and Mercer Lane. The store trip took me 10 minutes, max.  I drove around a little, looking for the mysterious lights, but they were nowhere to be found.
        </li>
        <li class="list-group-item">
            <b>Phoenix, AZ 1997-03-13</b>
            a "Flying wing" which fley over my car as i was on I10 heading west on 3-13-97 my grandmother and i were driving home from my aunts house. as we were at 67th ave on I10 we saw a flying wing heading in our direction. it looked like a airplane about to crash with ist lights on, but it made no sound of any kind. we got off the freeway at 83rd and followed the craft. we then heard a polie siren followng the craf when it suddenly blinked and was not visiable. we didn't know what to think until we got home and watched the 10:00 news. I would have posted this sonner but i only learned of this site a week ago.
        </li>
        <li class="list-group-item">
            <b>Phoenix, AZ 1997-03-13</b>
            early evening time object the size of 2 or three junbo jets could see lights invisible no sound moved incredibly slow like a zepplin balloon object was large about 2.5 i think of a large com. airliner flying south at a very slow speed i could see fixed lights but the body was not visible it made no sound i was listening to a portable headset outside in glendale az 3/13/97 no nieghbors had witnessed saw news team coverage the day after thought i would file this report since no one has ever figured out what it was definetly real but if it could be a stealth or spy plane would be my guess it was 8:05 or so passing my line of sight looking east from my home at about 55th and t-bird gl. az
        </li>
        <li class="list-group-item">
            <b>Phoenix, AZ 1997-03-13</b>
            Another report on the Phoenix lights, but every prospective is important to get the whole picture and or map the object as it decended on Phx. On March 13,1997, I decided to walk my small dog in the neighborhood, it was a nice evening,I walked NE, then back SW back toward my home. I was at the corner of Ramuda and the block behind my home when I somehow became aware of many lights coming toward me very slowly and deliberately.  They were red in color and not too bright but low, very low to the ground coming right towards me.  At first I thought,oh it's helicopters from the airforce base or something.  The lights were in a v shape but a very wide or fat v.  I saw 4 lights that seemed to be evenly apart and one lagged behind, uneven compared to the rest.  As they got closer still, I was acutley aware that this wasn't just helicopters                     because they were close, low and no sound could be heard from them at   all.  I just stood there in total awe.  Even the dog seemed to be aware  of this object or objects.  The object changed altitude right in front  of me, I tried to see stars throught he middle of the lights but saw  none.  As the object moved away it turned toward the west from coming  south and west. As the object changed direction,I could only see 3 lights,still red in color. It also changed speed.  I live in North  Phoenix in a subdivsion called Tatem Highlands closest crossroads being      Tatem and Jomax.  Many of my neighbors walk dogs late at night, however I seemed to have been out alone this particular night.  There were three folks I yelled at immediatly after the object moved away from me, but they didn't seem to understand what I was saying.  My husband is an astronomy teacher and "poohed,poohed" me when I told him what happened.  Of course the next day when the story was in the news, he seemed more interested.
        </li>
    </ul>
</div>

Phoenix Arizona, 1997.
[Google](http://lmgtfy.com/?q=phoenix+lights) this one.
[Read up](https://en.wikipedia.org/wiki/Phoenix_Lights), wake up folks.
It's probably the most famous mass sighting in recent history.

A _huge_ number of people saw a cluster of lights in a V formation flying over Phoenix for several hundred miles.
Don't believe me?
There's a photo.

<img src="https://www.gannett-cdn.com/-mm-/c874ad012946e9810f89cfbf35e0d07a60863a97/c=1-0-540-405&r=x404&c=534x401/local/-/media/2017/02/17/Phoenix/Phoenix/636229502332893938-lynnketeiphoenixlightshost.jpg" style="height:75%; width:75%">

Official reports by the Air Force - not released for _months_ afterwards - stated that a group of A-10 planes were flying over the region dropping flares.

<hr>

While I wouldn't take this as a 100% locked down explanation, I was able to show that a substantial number of UFO sightings occurred within a relatively short distance (from an aircraft perspective) from a US Air Force base.
I also showed that a hilariously large number of UFO sightings tend to occur on the fourth of July.
That one's not as straightforward as it looks - it could be fireworks, but also everyone's outside at night looking at the sky.

Drinking.

Okay maybe it is pretty straightforward.

Not so straightforward were the mass sightings that occur in the dataset.
I focused on Tinley Park, Rockford, and Carteret, but there are a lot more in this dataset.
You can check out the [notebook on GitHub](https://github.com/timothyrenner/not-so-close-encounters) and look at more of these yourself if you're so inclined.

Well that's all I've got for now.
Other things worth exploring are actually doing my due diligence on the whole population thing, incorporating weather and visibility conditions and other stuff I haven't thought of yet.
Right now though there's been this cable company van hanging out across the street from my house so I need to go ask what they want.
