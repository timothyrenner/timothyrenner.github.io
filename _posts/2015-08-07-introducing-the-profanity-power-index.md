---
title: "Introducing the Profanity Power Index"
tags: spark d3
categories: projects
layout: post
tweet_text: "Introducing the Profanity Power Index, built with #d3js and #spark. #GOPDebate"
---

Last night was the first Republican presidential debate of the 2016 race, and while many were thoroughly enjoying what I'm sure was a spectacular shitshow, I was hard at work monitoring the Twittersphere to collect the data everyone _really_ wants to know about the candidates: who's getting cussed at the most (**spoiler** it's Trump).

So here it is - the [Profanity Power Index]({{ site.url }}/profanitypowerindex): a visual representation of the vitriol and rage thrown at the 2016 Republican political candidates on Twitter during the course of the Fox News debate.

I collected the data using [Apache Spark](http://spark.apache.org) running on EC2 with a [Mesosphere](http://mesosphere.io) cluster.
I do plan on recounting the tale of how _that_ came together because it was ... eventful.
Let's just say that prior to Tuesday of this week, I'd never launched a single EC2 instance.
Last night I launched an eight-node cluster with Spark and HDFS like I actually knew what the hell I was doing.
Suffice it to say, Mesosphere is awesome.

So enjoy the graphic, and if you're so inclined, stay tuned for my experiences running Spark in the cloud.
If you aren't so inclined, I can sum up the execution of this project pretty succinctly:

<br>
<br>
<br>
<br>

![IN](http://cdn.lifebuzz.com/images/66351/lifebuzz-5d939b98938dd817b93889777fbeca0c-original.gif)