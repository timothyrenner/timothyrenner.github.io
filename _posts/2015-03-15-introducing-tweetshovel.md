---
title: "Introducing Tweetshovel"
tags: clojure twitter
categories: data
layout: post
tweet_text: "Introducing tweetshovel."
---

I mess around with Twitter data a lot.
I like to poke around and ask random, mostly irrelevant questions about tweets and make some plots.
Rather than working with huge datasets and doing hardcore machine learning, I prefer just to learn about the datasets and have a little fun, so when I fetch data from Twitter it's usually a pretty modest amount.

I've been iterating on some custom tooling for grabbing tweets from Twitter's REST APIs for a while (mostly user timelines, but sometimes search).
Tweetshovel is the "productized" iteration of that tooling.

It's a command line tool written in Clojure that also functions as a Clojure library.
You can check it out in detail at it's [github](https://github.com/timothyrenner/tweetshovel) page.
I'll just go over the broad strokes here.

## Command Line

In order to use tweetshovel, you'll need to be set up with API keys for Twitter.
Sign up as a developer, name your "app", and authorize it.
The steps are roughly outlined on [this forum post](https://twittercommunity.com/t/how-to-get-my-api-key/7033).
Put the keys in a JSON file that looks like this:

{% highlight json %}
{
  "CONSUMER_KEY":    "xxxxxxxxxx",
  "CONSUMER_SECRET": "xxxxxxxxxx",
  "OAUTH_TOKEN":     "xxxxxxxxxx",
  "OAUTH_SECRET":    "xxxxxxxxxx"
}
{% endhighlight %}

Let's say it's called `twitter_auth.json`.
Assuming it's on your `$PATH` (obviously not a requirement) you can grab a timeline with the following command:

{% highlight bash %}
$ tweetshovel --auth twitter_auth.json --output RikerGoogling.json --timeline RikerGoogling
{% endhighlight %}

This will reach out and grab [RikerGoogling](https://twitter.com/rikergoogling)'s tweets and drop them into `RikerGoogling.json`.
The `--output` flag can be omitted, in which case the JSON object will go to stdout.

Where tweetshovel really shines is when you need to grab a bunch of timelines in a row.
Each API endpoint has a rate limit, and tweetshovel goes to great lengths to keep the number of calls under this rate limit, sleeping until the window resets if necessary.

A search is similar.
Here's one I did for a previous post:

{% highlight bash %}
$ tweetshovel --search '#ddtx15' --auth twitter_auth.json --output ddtx15.json
{% endhighlight %}

This tool didn't exist in it's current form at the time, but you get the idea.
I'll say this about the search feature: be careful with it.
There could be a huge amount of tweets depending on your query, so you could be potentially waiting a very long time to get any results.
For huge datasets, the streaming API is a much much better way to go.

Download the command line tool <a href="https://s3.amazonaws.com/timothyrenner.binaries/tweetshovel" download>here</a> and give it execute permissions and you're ready to rock.
It does require a recent-ish version of Java (1.6+ I think, but I'm not positive).

## Clojure Library

It's also a Clojure library.
Invoking tweetshovel as a library gives considerably more control over how the calls are made.

Put this in your leiningen `project.clj` file under `:dependencies`.

{% highlight clojure %}
[tweetshovel "0.1.0"]
{% endhighlight %}

You can get the full skinny on the libraries with the [github readme](https://github.com/timothyrenner/tweetshovel) and the [API docs](http://timothyrenner.github.io/tweetshovel), but here's a quick example:

{% highlight clojure %}
(ns my-ns
  (:require [tweetshovel.core :as ts]
            [cheshire.core :as json]))

;; Credentials.
(def cred-map (json/parse-string (slurp "twitter_auth.json")))

;; Grab some tweets.
(def haskell-ceo (ts/shovel-timeline "HaskellCEO"
                                      (make-creds cred-map)))
{% endhighlight %}

Okay so this maybe isn't the best example because you could just do it at the command line, but this is the gist of calling it within Clojure.
The [readme](https://github.com/timothyrenner/tweetshovel) has more detailed examples.

## Why Clojure?

This is a loaded question, and probably something I'll expound upon as it's own post.
Basically, I'm learning Clojure and it's a good fit for the problem.
Clojure's a bad ass language and Leiningen is a bad ass tool.
The code is clear and testable and wasn't difficult to write at all.
Also, I got to use the `spit` and `slurp` functions, so now I have all kinds of great pictures in my head when I use it.
Thanks, Clojure.

I do plan on implementing the solution as a Python library in the future for tight integration with the data science stack.

## Future Plans

I'd like to add some features, for example followers/following, lookups (for hydration), etc.
There's also the aforementioned Python library implementation.
