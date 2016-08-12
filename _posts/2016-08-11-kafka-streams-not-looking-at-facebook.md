---
title: "Kafka Streams - Not Looking at Facebook"
tags: streams kafka
categories: engineering
layout: post
tweet_text: "Not Looking at Facebook: a Kafka Streams walkthrough. #kafka"
---

The May release of Kafka 0.10 included a very cool new component: Kafka Streams, a stream processing library that directly integrates with Kafka.
There are a number of things that Kafka Streams does differently from other stream processors, and the best way to learn is through example.
To that end I've chosen a highly relevant example in the social networking space, something that I think any developer can put to use immediately.

<img src="https://raw.githubusercontent.com/timothyrenner/kafka-streams-ex/master/not-looking-at-facebook/images/not_looking_at_facebook.png" style="height:75%; width:75%">

You can read the press release [here](http://www.theonion.com/article/new-facebook-notifications-alert-users-when-they-n-37795).

What I'll do is illustrate the various components of Kafka Streams's "high level DSL" by building this incredibly useful and relevant thing out.
I gave a walkthrough of this example at the Austin Kafka meetup; the slides are [here](http://timothyrenner.github.io/talks/20160714-kafka-streams/), and there's code on [GitHub](https://github.com/timothyrenner/kafka-streams-ex/tree/master/not-looking-at-facebook) if you're impatient and want to get started right away.

# KStream

Imagine we have a stream of user events on a Kafka topic that tells us when a user opens or closes Facebook.
The end goal is to use that stream to send data to a topic that serves notifications - the notification payload in this case will be the incredibly helpful "You are not currently viewing Facebook."

A stream of data can be interpreted in a couple of different ways, and the way a stream is interpreted governs how it is used in an application.
In this case what we have is an _event stream_ - each event in the stream is a standalone unit of information (we'll see a different stream interpretation later).
The simplest solution is to filter the incoming user events to only those that close Facebook, and build a payload message for the notifications topic.

<img src="https://raw.githubusercontent.com/timothyrenner/timothyrenner.github.io/master/talks/20160714-kafka-streams/images/stateless_solution_2.png" style="height:75%; width:75%">

The transformation is entirely _stateless_; the stream is just a series of events, and we're filtering and transforming it into a new stream without storing any information from event to event.
In Kafka Streams, this abstraction is called a KStream.
This is the code for the above solution (truncated to just the business parts).

{% highlight java %}
// Stream from a Kafka topic.
builder.stream("open")
       
       // Remove "Open" events.
       .filter((k,v) -> v == "Close")
       
       // Add the helpful notification message.
       .mapValues(v -> "You are not currently viewing Facebook.")
       
       // Sink to a Kafka topic.
       .to("notifications");
{% endhighlight %}

The `builder` object is essentially the "entry point" for constructing Kafka Streams jobs.
We call the `stream` method to treat incoming data from the topic as an event stream, keep only the "Close" events, change the message to our helpful notification, then sink it to the "notifications" topic.

Technically this does solve our problem: whenever someone closes the app, they get a notification.
It contains one critical flaw, however.
It only sends _one_ notification.
What if someone ignores it?
An even better solution is to _continue_ sending notifications until the user logs on again.
To do that, we'll need to remember whether someone's logged on or off.
We need _state_.

# KTable

If we want to remember whether someone's logged on or off, we need to change our interpretation of the stream.
Now the events aren't standalone; they're connected to a _state_.
Each time a user event comes in as "Open" or "Close", that state changes.
This is called a _changelog_ stream.
To capture changelog streams, Kafka Streams has a separate stateful abstraction: the KTable.
This is what our KTable looks like as data rolls in:

<img src="http://timothyrenner.github.io/talks/20160714-kafka-streams/images/stateful_solution_2.png" style="height:75%; width:75%">

The KTable is essentially a _view_ of the stream.
This is important for one simple reason: that stream is immutable, and it is stored in Kafka.
Compare this to a traditional database write, which clobbers the state on every update. 
This means the state is only valid for the current time - "rewinding" to a past state is impossible.
But that's not how data works - what's true now wasn't true in the past, but it doesn't make the past _false_ either.
The true state changes with _time_.
When you treat the state as a view of a stream the time is built into the stream, which is immutable.
This is a true representation of state - the truth depends on the stream, which is a function of time.
The result is that for all time the state is valid because the data making up the state is immutable and always true for a given moment in time.

So now that we have our state, we need to use it to deliver the notifications.
We'll use a second stream for that - an event stream that delivers "ticks" at a fixed time interval - and join it to the state.

<img src="http://timothyrenner.github.io/talks/20160714-kafka-streams/images/stateful_solution_4.png" style="height:75%; width:75%">

You're welcome, Mark.
And by the way, if you're wondering whether it's a wise idea to run events through our real-time system at a regular interval for _every user on Facebook_ please remind yourself what we're building here.

Here's the code for our table-stream join.

{% highlight java %}
KStream<String, String> ticks = builder.stream("tick");

// Now we stream "open" as a table.
KTable<String, String>  open = builder.table("open");

// Join ticks to the open table.
KStream<String, String> closedTicks = 
    ticks.leftJoin(open, (vtick, vopen) -> vopen)

         // Filter the "closed" entries in the new stream.
         .filter((k,v) -> v == "Closed");

        // Now fill in the message.
        .mapValues(v -> "You are not currently viewing Facebook.");

// Sink the messages to the "notifications" topic.
closedTicks.to("notifications");
{% endhighlight %}

# Windows

So we've got our system built, but we need to measure it.
To that end, let's put in some analytics.
Let's count the number of these notifications we've sent per user for the past ten minutes.
That's ... probably about as useful as everything else we've been working on.

Kafka Streams does windows a little differently from other stream processors like Spark Streaming.
Rather than defining the windowing on the operation, Kafka Streams declares the windowing on the keys of the KStream or KTable.
"Time" windows like this (there are also "join" windows for joining two KStreams) take two time parameters - the total time and the interval time.
In the picture below, the full time is 3 minutes with 1 minute intervals.

<img src="http://timothyrenner.github.io/talks/20160714-kafka-streams/images/windows.png" style="height:75%; width:75%">

The "bottom" most window-interval in the table (note the keys are what's windowed) contains three minutes of data, the middle interval has two minutes, and the top interval contains one minute of data.
As time advances, the bottom interval falls off while a new one appears at the top.

<img src="http://timothyrenner.github.io/talks/20160714-kafka-streams/images/windows_2.png" style="height:75%; width:75%">

The other thing that differentiates Kafka Streams from Spark Streaming is what gets passed along when new data rolls in.
In Spark Streaming, the bottom-most interval of the window gets passed down the topology at the switch point.
In this example it would be every minute.
In Kafka Streams, it's all keys that get updated - including the intervals - and this happens _any time new data arrives_, not just at the interval switch points.

<img src="http://timothyrenner.github.io/talks/20160714-kafka-streams/images/windows_3.png" style="height:75%; width:75%">

The stream of data coming from this table is really a stream of _updates_ to it - that makes it a changelog stream.
In the introductory [blog post](http://www.confluent.io/blog/introducing-kafka-streams-stream-processing-made-simple), Jay Kreps calls this _stream-table duality_.
A table is a (possibly aggregated) view of a stream, and changes to the table form a new stream to be processed or sent down the topology.

The keys in the output changelog stream contain information about the time boundaries for the window; further reasoning around those times needs to be done manually (at least at the moment). 
In this case let's just pass all of them downstream and let the data scientists deal with it.

The code is pretty simple.

{% highlight java %}
KTable<Windowed<String>, Long> notificationCounts = 
    closedTicks.countByKey(
        TimeWindows.of("notificationCounts", 60000L * 10)
                   // "Hop" the windows every minute.
                   .advanceBy(60000L)
                   // Ignore late values.
                   .until(60000L * 10));
               
// Convert the table updates to a stream.
// Note we need to extract the key from the window. 
notificationCounts.toStream((k,v) -> k.key())
                  .to("metrics");
{% endhighlight %}

# Scaling and Deployment

So one thing I haven't talked about is how this thing gets deployed - how are instances started and allocated?
What happens if an instance goes down?
Who gets paged when this doesn't work?

That's because there isn't much to talk about.
Kafka Streams isn't a framework, it's a library.
This means deploying a Kafka Streams application is simple - it's just a Java application.
No fancy submit scripts or containers required.
Of course, if you want to use a container you can, but it really can be as simple as calling `java` on your app's main class.

Deployment's only part of the story, however.
Under the hood of this fancy DSL is a Storm-style topology.
While it's possible to construct this directly with the Processor API, that's a topic (see what I did there?) for another time.
Here's a visual approximation of the topology we've been building.

<img src="http://timothyrenner.github.io/talks/20160714-kafka-streams/images/under_the_hood.png" style="height:75%; width:75%">

Our topology contains state, which means we need to understand what happens if an instance of the application fails.
Arguably the greatest advantage to Kafka Streams is its tight integration with Kafka.
Kafka itself contains partition migration in the event that consumers fail using the server-side coordination features introduced in 0.9.
So in the event of failover, we already know that the partitions will make it to a streams application, but what about the state?
Well, a Kafka Streams topology actually creates internal application-specific topics for just this case.
KTables and Windows are backed up to Kafka itself for durability - if an application instance fails the partitions it was consuming get moved to a live instance via consumer migration.

<img src="http://timothyrenner.github.io/talks/20160714-kafka-streams/images/under_the_hood_3.png"  style="height:75%; width:75%">

The state of the KTables and Windows are then _replayed_ from the backup topic until they're up to date. 
Then the application starts sending data again.

The other area Kafka Streams leans on Kafka is network shuffles.
Stateful interactions such as aggregations and joins require a shuffle across the network in any distributed system, Kafka Streams included.
This is also done with internal topics.

<img src="http://timothyrenner.github.io/talks/20160714-kafka-streams/images/under_the_hood_4.png" style="height:75%; width:75%">

# tl;dr

Kafka Streams is a simple and straightforward way to build stream processing applications that tightly integrate with Kafka.
It provides a high-level DSL, a low-level Processor API (not really discussed here), and managed, durable semantics for stateful operations.

The full code for this example is in [this](https://github.com/timothyrenner/kafka-streams-ex/tree/master/not-looking-at-facebook) subproject of a larger repository containing several examples using Kafka Streams.

There are a ton more resources for Kafka Streams on [Confluent's blog](http://www.confluent.io/blog), and there are [several](https://youtu.be/o7zSLNiTZbA) [talks]( http://kafka-summit.org/sessions/introducing-kafka-streams-large-scale-stream-processing-with-kafka/) about the subject from the folks at Confluent.
