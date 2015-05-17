---
title: "Random Walk With Me"
tags: julia
categories: programming
layout: post
tweet_text: "Random walk with me. #julialang"
---

Random walks are a very handy simulation tool.
They can be used to simulate financial data (e.g. stock prices), count data as a function of time - even molecular motion.
They can also be used to traverse graphs.
This post explains the basics of the random walk in a couple of different scenarios (with pictures!) and shows some tips for implementing them in really nice ways.
The language of choice here is Julia, but the implementation details apply to any language with a decent random number generator and a `reduce` function.

To run this notebook, you'll need the [Gadfly](http://gadflyjl.org/) package and the [Distributions](http://distributionsjl.readthedocs.org/en/latest/index.html) package.
Install them as follows:

{% highlight julia %}
Pkg.add("Gadfly");
Pkg.add("Distributions");
{% endhighlight %}

{% highlight julia %}
using Gadfly        # Plots!
using Distributions # Random Numbers!
{% endhighlight %}

## The Math

Now that we've exhausted ourselves with all that code, let's do some math.
The textbook (and by textbook I mean Wikipedia) definition of a random walk is 

> A random walk is a mathematical formalization of a path that consists of a succession of random steps.
>
> \- Wikipedia

So what that means is that each _step_ of the path is random.
That's pretty general.
For this discussion we're going to limit ourselves to random walks whose steps depend only on the current step's value.
These random walks can be described as [Markov Chains](http://en.wikipedia.org/wiki/Markov_chain).
Specifically, that means that each step in our random walk is a function of the current step, so 

$$s_{n+1} = f(x_n)$$, 

where $$f$$ is some function and $$x_n$$ is the current value of the walk.

But remember we're talking about _random_ walks, so really $$f(x_n)$$ is some kind of random variable, or - more generally - a function of some distribution,

$$s_{n+1} = f(x_n) \sim D(\theta(x_n))$$.

Here, $$D$$ is a distribution and $$\theta$$ is the parameters for that distribution.
Now Markov Chain random walks can be applied to a variety of spaces - we'll focus on discrete (such as count data) and continuous (such as stock prices) spaces here, but you can also random walk on lattices and graphs where each node has only a few available paths.
This is one way to compute [PageRank](http://en.wikipedia.org/wiki/PageRank#Distributed_Algorithm_for_PageRank_Computation).

Note that the Markov Chain constraint I conveniently set for myself limits the function _and_ distribution parameter parameters (?) to only the latest value of the walk, but to make things simpler I'll declare that the distribution and the step doesn't depend on the current position, meaning

$$s_{n+1} = f \sim D(\theta)$$.

Having the size of the step depend on the current position is a really useful formalism, particularly in the physical sciences (where you might have some force/field term acting on the walker in addition to the random elements), but the implementation without this dependence is really _really_ simple.

So, at each step, we can compute the position of the next step with the following equation

$$x_{n+1} = x_n + f^{D(\theta)}$$

where $$f$$ is a function of a random draw from a distribution $$D(\theta)$$.

## The Code

There are a few ways to implement this.
The simplest way is to use loops, like so:

{% highlight julia %}

# Initialize the array to fill.
gaussian_walk = zeros(100);

# Initialize the starting position.
gaussian_walk[1] = 1.0;

# Loop over the walk and add the random noise.
for ii=2:length(gaussian_walk)
    gaussian_walk[ii] = gaussian_walk[ii-1] + rand(Normal());
end

draw(SVG(16cm, 8cm), plot(x=1:length(gaussian_walk), y=gaussian_walk, Geom.line))
{% endhighlight %}

<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     xmlns:gadfly="http://www.gadflyjl.org/ns"
     version="1.2"
     width="160mm" height="80mm" viewBox="0 0 160 80"
     stroke="none"
     fill="#000000"
     stroke-width="0.3"
     font-size="3.88"
>
<g class="plotroot xscalable yscalable" id="fig-b739d84405a4466fbfed882187d182c9-element-1">
  <g font-size="3.88" font-family="'PT Sans','Helvetica Neue','Helvetica',sans-serif" fill="#564A55" stroke="#000000" stroke-opacity="0.000" id="fig-b739d84405a4466fbfed882187d182c9-element-2">
    <text x="86.13" y="72" text-anchor="middle">x</text>
  </g>
  <g class="guide xlabels" font-size="2.82" font-family="'PT Sans Caption','Helvetica Neue','Helvetica',sans-serif" fill="#6C606B" id="fig-b739d84405a4466fbfed882187d182c9-element-3">
    <text x="19.27" y="64.39" text-anchor="middle">0</text>
    <text x="86.13" y="64.39" text-anchor="middle">50</text>
    <text x="153" y="64.39" text-anchor="middle">100</text>
  </g>
  <g clip-path="url(#fig-b739d84405a4466fbfed882187d182c9-element-5)" id="fig-b739d84405a4466fbfed882187d182c9-element-4">
    <g pointer-events="visible" opacity="1" fill="#000000" fill-opacity="0.000" stroke="#000000" stroke-opacity="0.000" class="guide background" id="fig-b739d84405a4466fbfed882187d182c9-element-6">
      <rect x="17.27" y="5" width="137.73" height="55.72"/>
    </g>
    <g class="guide ygridlines xfixed" stroke-dasharray="0.5,0.5" stroke-width="0.2" stroke="#D0D0E0" id="fig-b739d84405a4466fbfed882187d182c9-element-7">
      <path fill="none" d="M17.27,58.72 L 155 58.72"/>
      <path fill="none" d="M17.27,41.48 L 155 41.48"/>
      <path fill="none" d="M17.27,24.24 L 155 24.24"/>
      <path fill="none" d="M17.27,7 L 155 7"/>
    </g>
    <g class="guide xgridlines yfixed" stroke-dasharray="0.5,0.5" stroke-width="0.2" stroke="#D0D0E0" id="fig-b739d84405a4466fbfed882187d182c9-element-8">
      <path fill="none" d="M19.27,5 L 19.27 60.72"/>
      <path fill="none" d="M86.13,5 L 86.13 60.72"/>
      <path fill="none" d="M153,5 L 153 60.72"/>
    </g>
    <g class="plotpanel" id="fig-b739d84405a4466fbfed882187d182c9-element-9">
      <g stroke-width="0.3" fill="#000000" fill-opacity="0.000" class="geometry" stroke="#00BFFF" id="fig-b739d84405a4466fbfed882187d182c9-element-10">
        <path fill="none" d="M20.6,20.79 L 21.94 20.92 23.28 16.08 24.62 17.34 25.95 17.62 27.29 21.15 28.63 26.76 29.96 27.53 31.3 32.96 32.64 28.09 33.98 30.91 35.31 29.62 36.65 37.27 37.99 34.81 39.33 39.08 40.66 32.96 42 34.59 43.34 34.93 44.68 45.5 46.01 49.42 47.35 53.62 48.69 51.91 50.02 51.55 51.36 48.46 52.7 45.4 54.04 46.38 55.37 45.21 56.71 45.98 58.05 48.91 59.39 51.98 60.72 47.17 62.06 43.14 63.4 40.09 64.74 46.39 66.07 45.2 67.41 48.09 68.75 47.53 70.08 40.8 71.42 39.79 72.76 37.5 74.1 41.52 75.43 48.14 76.77 52.17 78.11 49.2 79.45 55.23 80.78 55.16 82.12 56.39 83.46 54.14 84.8 55.32 86.13 53.56 87.47 54.93 88.81 53.63 90.14 53.8 91.48 50.33 92.82 54.39 94.16 52.03 95.49 49.71 96.83 47.09 98.17 47.42 99.51 44.23 100.84 42.33 102.18 39.68 103.52 39.83 104.86 38.07 106.19 38.01 107.53 35.49 108.87 30.92 110.21 33.77 111.54 36.81 112.88 39.37 114.22 39.99 115.55 38.03 116.89 36.35 118.23 35.08 119.57 34.19 120.9 34.09 122.24 34.53 123.58 32.85 124.92 33.66 126.25 32.93 127.59 33.11 128.93 33.54 130.27 34.85 131.6 42.18 132.94 45.83 134.28 47.72 135.61 42.59 136.95 44.95 138.29 46.41 139.63 50.76 140.96 51.33 142.3 53.78 143.64 53.97 144.98 54.37 146.31 46.33 147.65 44.26 148.99 39.62 150.33 39.59 151.66 44.64 153 46.02"/>
      </g>
    </g>
  </g>
  <g class="guide ylabels" font-size="2.82" font-family="'PT Sans Caption','Helvetica Neue','Helvetica',sans-serif" fill="#6C606B" id="fig-b739d84405a4466fbfed882187d182c9-element-11">
    <text x="16.27" y="58.72" text-anchor="end" dy="0.35em">-10</text>
    <text x="16.27" y="41.48" text-anchor="end" dy="0.35em">-5</text>
    <text x="16.27" y="24.24" text-anchor="end" dy="0.35em">0</text>
    <text x="16.27" y="7" text-anchor="end" dy="0.35em">5</text>
  </g>
  <g font-size="3.88" font-family="'PT Sans','Helvetica Neue','Helvetica',sans-serif" fill="#564A55" stroke="#000000" stroke-opacity="0.000" id="fig-b739d84405a4466fbfed882187d182c9-element-12">
    <text x="8.81" y="32.86" text-anchor="end" dy="0.35em">y</text>
  </g>
</g>
<defs>
<clipPath id="fig-b739d84405a4466fbfed882187d182c9-element-5">
  <path d="M17.27,5 L 155 5 155 60.72 17.27 60.72" />
</clipPath
></defs>
</svg>

So that's three distinct statements to produce the walk.
Can we do it in one?
Thanks to `reduce`, we most certainly can.
If you're unfamiliar with how `reduce` works, yours truly is a little obsessed and wrote a post about it [here](http://timothyrenner.github.io/programming/2015/04/04/reduce-for-the-uninitiated.html).

Let's try to duplicate the loop method with `reduce`.
It's a little more concise, but all around isn't that different.

{% highlight julia %}
gaussian_walk_reduced = 
    reduce((a,x) -> [a (a[end] + rand(Normal()))], # Add draw to the last accumulator value.
    [1.0],                                         # Starting position.
    1:99);                                         # Number of iterations.

draw(SVG(16cm, 8cm), 
      plot(x=1:length(gaussian_walk_reduced), 
           y=gaussian_walk_reduced, Geom.line))
{% endhighlight %}

<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     xmlns:gadfly="http://www.gadflyjl.org/ns"
     version="1.2"
     width="160mm" height="80mm" viewBox="0 0 160 80"
     stroke="none"
     fill="#000000"
     stroke-width="0.3"
     font-size="3.88"
>
<g class="plotroot xscalable yscalable" id="fig-2b720ded703e45a4b248b0b3f491c58b-element-1">
  <g font-size="3.88" font-family="'PT Sans','Helvetica Neue','Helvetica',sans-serif" fill="#564A55" stroke="#000000" stroke-opacity="0.000" id="fig-2b720ded703e45a4b248b0b3f491c58b-element-2">
    <text x="85.58" y="72" text-anchor="middle">x</text>
  </g>
  <g class="guide xlabels" font-size="2.82" font-family="'PT Sans Caption','Helvetica Neue','Helvetica',sans-serif" fill="#6C606B" id="fig-2b720ded703e45a4b248b0b3f491c58b-element-3">
    <text x="18.15" y="64.39" text-anchor="middle">0</text>
    <text x="85.58" y="64.39" text-anchor="middle">50</text>
    <text x="153" y="64.39" text-anchor="middle">100</text>
  </g>
  <g clip-path="url(#fig-2b720ded703e45a4b248b0b3f491c58b-element-5)" id="fig-2b720ded703e45a4b248b0b3f491c58b-element-4">
    <g pointer-events="visible" opacity="1" fill="#000000" fill-opacity="0.000" stroke="#000000" stroke-opacity="0.000" class="guide background" id="fig-2b720ded703e45a4b248b0b3f491c58b-element-6">
      <rect x="16.15" y="5" width="138.85" height="55.72"/>
    </g>
    <g class="guide ygridlines xfixed" stroke-dasharray="0.5,0.5" stroke-width="0.2" stroke="#D0D0E0" id="fig-2b720ded703e45a4b248b0b3f491c58b-element-7">
      <path fill="none" d="M16.15,58.72 L 155 58.72"/>
      <path fill="none" d="M16.15,45.79 L 155 45.79"/>
      <path fill="none" d="M16.15,32.86 L 155 32.86"/>
      <path fill="none" d="M16.15,19.93 L 155 19.93"/>
      <path fill="none" d="M16.15,7 L 155 7"/>
    </g>
    <g class="guide xgridlines yfixed" stroke-dasharray="0.5,0.5" stroke-width="0.2" stroke="#D0D0E0" id="fig-2b720ded703e45a4b248b0b3f491c58b-element-8">
      <path fill="none" d="M18.15,5 L 18.15 60.72"/>
      <path fill="none" d="M85.58,5 L 85.58 60.72"/>
      <path fill="none" d="M153,5 L 153 60.72"/>
    </g>
    <g class="plotpanel" id="fig-2b720ded703e45a4b248b0b3f491c58b-element-9">
      <g stroke-width="0.3" fill="#000000" fill-opacity="0.000" class="geometry" stroke="#00BFFF" id="fig-2b720ded703e45a4b248b0b3f491c58b-element-10">
        <path fill="none" d="M19.5,43.2 L 20.85 41.61 22.2 44.71 23.55 47.67 24.89 46.23 26.24 43.9 27.59 45.66 28.94 48.26 30.29 51.67 31.64 51.84 32.99 49.44 34.33 51.3 35.68 48.91 37.03 47.49 38.38 48.02 39.73 46.95 41.08 43.77 42.43 48.63 43.77 48.48 45.12 43.72 46.47 43.11 47.82 47.3 49.17 47.19 50.52 48.82 51.86 50.92 53.21 53.48 54.56 47.57 55.91 46.18 57.26 46.71 58.61 44.62 59.96 43.53 61.3 39.2 62.65 40.47 64 42.73 65.35 41.73 66.7 38.52 68.05 37.11 69.39 39.39 70.74 30.83 72.09 29.17 73.44 33.34 74.79 30.43 76.14 29.47 77.49 24.11 78.83 22 80.18 22.09 81.53 17.38 82.88 13.87 84.23 15.14 85.58 19.85 86.92 17.89 88.27 21.13 89.62 24.13 90.97 26.22 92.32 32.12 93.67 33.6 95.02 35.54 96.36 36.46 97.71 39.57 99.06 37.08 100.41 37.65 101.76 39.69 103.11 37.32 104.45 39.09 105.8 41.25 107.15 42.15 108.5 44.56 109.85 44.68 111.2 45.43 112.55 45.19 113.89 45.4 115.24 42.5 116.59 44.48 117.94 44.75 119.29 39.37 120.64 39.07 121.99 39.39 123.33 41.55 124.68 40.86 126.03 35.28 127.38 36.27 128.73 37.26 130.08 39.71 131.42 41.46 132.77 39.43 134.12 39.45 135.47 39.01 136.82 37.64 138.17 33.38 139.52 30.1 140.86 30.47 142.21 30.8 143.56 32.18 144.91 29.07 146.26 31.71 147.61 34.48 148.95 33.38 150.3 33.14 151.65 35.15 153 32.21"/>
      </g>
    </g>
  </g>
  <g class="guide ylabels" font-size="2.82" font-family="'PT Sans Caption','Helvetica Neue','Helvetica',sans-serif" fill="#6C606B" id="fig-2b720ded703e45a4b248b0b3f491c58b-element-11">
    <text x="15.15" y="58.72" text-anchor="end" dy="0.35em">-5</text>
    <text x="15.15" y="45.79" text-anchor="end" dy="0.35em">0</text>
    <text x="15.15" y="32.86" text-anchor="end" dy="0.35em">5</text>
    <text x="15.15" y="19.93" text-anchor="end" dy="0.35em">10</text>
    <text x="15.15" y="7" text-anchor="end" dy="0.35em">15</text>
  </g>
  <g font-size="3.88" font-family="'PT Sans','Helvetica Neue','Helvetica',sans-serif" fill="#564A55" stroke="#000000" stroke-opacity="0.000" id="fig-2b720ded703e45a4b248b0b3f491c58b-element-12">
    <text x="8.81" y="32.86" text-anchor="end" dy="0.35em">y</text>
  </g>
</g>
<defs>
<clipPath id="fig-2b720ded703e45a4b248b0b3f491c58b-element-5">
  <path d="M16.15,5 L 155 5 155 60.72 16.15 60.72" />
</clipPath
></defs>
</svg>


The `1:99` is a little annoying - it serves to index the collection for iteration, and that's it.
Fewer indices is nice, but there's a better way.

Well, remember when we said the random draws would be independent from the position?
This means we can perform the random draws _ahead_ of time and zip along the step changes.

{% highlight julia %}
gaussian_walk_reduced_two = 
    reduce((a,x) -> [a (a[end] + x)], # Grab the last element and add x (the random draw)
    [1.0],                            # Starting accumulator
    [rand(Normal(), 99)]);            # This is the collection of deltas

draw(SVG(16cm, 8cm), 
     plot(x=1:length(gaussian_walk_reduced_two), 
          y=gaussian_walk_reduced_two, Geom.line))
{% endhighlight %}

<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     xmlns:gadfly="http://www.gadflyjl.org/ns"
     version="1.2"
     width="160mm" height="80mm" viewBox="0 0 160 80"
     stroke="none"
     fill="#000000"
     stroke-width="0.3"
     font-size="3.88"
>
<g class="plotroot xscalable yscalable" id="fig-63f2cca21cc4432497844626023b81b9-element-1">
  <g font-size="3.88" font-family="'PT Sans','Helvetica Neue','Helvetica',sans-serif" fill="#564A55" stroke="#000000" stroke-opacity="0.000" id="fig-63f2cca21cc4432497844626023b81b9-element-2">
    <text x="86.13" y="72" text-anchor="middle">x</text>
  </g>
  <g class="guide xlabels" font-size="2.82" font-family="'PT Sans Caption','Helvetica Neue','Helvetica',sans-serif" fill="#6C606B" id="fig-63f2cca21cc4432497844626023b81b9-element-3">
    <text x="19.27" y="64.39" text-anchor="middle">0</text>
    <text x="86.13" y="64.39" text-anchor="middle">50</text>
    <text x="153" y="64.39" text-anchor="middle">100</text>
  </g>
  <g clip-path="url(#fig-63f2cca21cc4432497844626023b81b9-element-5)" id="fig-63f2cca21cc4432497844626023b81b9-element-4">
    <g pointer-events="visible" opacity="1" fill="#000000" fill-opacity="0.000" stroke="#000000" stroke-opacity="0.000" class="guide background" id="fig-63f2cca21cc4432497844626023b81b9-element-6">
      <rect x="17.27" y="5" width="137.73" height="55.72"/>
    </g>
    <g class="guide ygridlines xfixed" stroke-dasharray="0.5,0.5" stroke-width="0.2" stroke="#D0D0E0" id="fig-63f2cca21cc4432497844626023b81b9-element-7">
      <path fill="none" d="M17.27,58.72 L 155 58.72"/>
      <path fill="none" d="M17.27,45.79 L 155 45.79"/>
      <path fill="none" d="M17.27,32.86 L 155 32.86"/>
      <path fill="none" d="M17.27,19.93 L 155 19.93"/>
      <path fill="none" d="M17.27,7 L 155 7"/>
    </g>
    <g class="guide xgridlines yfixed" stroke-dasharray="0.5,0.5" stroke-width="0.2" stroke="#D0D0E0" id="fig-63f2cca21cc4432497844626023b81b9-element-8">
      <path fill="none" d="M19.27,5 L 19.27 60.72"/>
      <path fill="none" d="M86.13,5 L 86.13 60.72"/>
      <path fill="none" d="M153,5 L 153 60.72"/>
    </g>
    <g class="plotpanel" id="fig-63f2cca21cc4432497844626023b81b9-element-9">
      <g stroke-width="0.3" fill="#000000" fill-opacity="0.000" class="geometry" stroke="#00BFFF" id="fig-63f2cca21cc4432497844626023b81b9-element-10">
        <path fill="none" d="M20.6,30.27 L 21.94 30.5 23.28 29.03 24.62 26.71 25.95 27.83 27.29 28.02 28.63 28.22 29.96 26.42 31.3 27.97 32.64 23.28 33.98 27 35.31 24.2 36.65 25.93 37.99 29.27 39.33 31.17 40.66 29.78 42 29.16 43.34 26.96 44.68 33.13 46.01 28.14 47.35 27.24 48.69 23.74 50.02 22.88 51.36 27.28 52.7 28.27 54.04 26.47 55.37 26.4 56.71 22.63 58.05 24.8 59.39 29.4 60.72 31.1 62.06 30.34 63.4 29.08 64.74 28.08 66.07 29.27 67.41 25.23 68.75 30.22 70.08 32.73 71.42 33.3 72.76 33.98 74.1 37.55 75.43 40.85 76.77 38.29 78.11 38.26 79.45 38.63 80.78 38.87 82.12 43.32 83.46 42.77 84.8 42.16 86.13 40.36 87.47 36.03 88.81 35.44 90.14 28.58 91.48 29.43 92.82 29.77 94.16 26.07 95.49 24.83 96.83 22.96 98.17 24.31 99.51 20.78 100.84 20.64 102.18 21.95 103.52 21.34 104.86 19.07 106.19 24 107.53 28.2 108.87 30.22 110.21 29.83 111.54 29.8 112.88 31.89 114.22 35.07 115.55 34.69 116.89 30.08 118.23 28.21 119.57 31.34 120.9 33.74 122.24 36.37 123.58 43.18 124.92 45.56 126.25 48.61 127.59 50.69 128.93 49 130.27 41.35 131.6 41.01 132.94 40.45 134.28 40.52 135.61 40.16 136.95 41.77 138.29 43.65 139.63 41.11 140.96 35.01 142.3 35.13 143.64 34.52 144.98 35.88 146.31 35.69 147.65 35.95 148.99 39.26 150.33 38.06 151.66 38.87 153 41.01"/>
      </g>
    </g>
  </g>
  <g class="guide ylabels" font-size="2.82" font-family="'PT Sans Caption','Helvetica Neue','Helvetica',sans-serif" fill="#6C606B" id="fig-63f2cca21cc4432497844626023b81b9-element-11">
    <text x="16.27" y="58.72" text-anchor="end" dy="0.35em">-10</text>
    <text x="16.27" y="45.79" text-anchor="end" dy="0.35em">-5</text>
    <text x="16.27" y="32.86" text-anchor="end" dy="0.35em">0</text>
    <text x="16.27" y="19.93" text-anchor="end" dy="0.35em">5</text>
    <text x="16.27" y="7" text-anchor="end" dy="0.35em">10</text>
  </g>
  <g font-size="3.88" font-family="'PT Sans','Helvetica Neue','Helvetica',sans-serif" fill="#564A55" stroke="#000000" stroke-opacity="0.000" id="fig-63f2cca21cc4432497844626023b81b9-element-12">
    <text x="8.81" y="32.86" text-anchor="end" dy="0.35em">y</text>
  </g>
</g>
<defs>
<clipPath id="fig-63f2cca21cc4432497844626023b81b9-element-5">
  <path d="M17.27,5 L 155 5 155 60.72 17.27 60.72" />
</clipPath
></defs>
</svg>

Okay, we're almost there, but we need one more piece to the puzzle.
Remember our equation for the random walk?

$$x_{n+1} = x_n + f^{D(\theta)}$$

Well that little $$f$$ up there isn't going to apply itself.
There are two places to do it - we can apply it in the accumulator, or we can apply it on the collection of steps we're reducing.
It seems more natural to apply the function to the collection itself, so that's what I'll do.

Suppose we only wanted a Gaussian random walk that goes in the positive direction - then $$f$$ is `abs`.

{% highlight julia %}
gaussian_walk_positive = 
    reduce((a,x) -> [a (a[end] + x)], # Same walker reduce function.
    [1.0],                            # Starting point.
    abs(rand(Normal(), 99)));         # Absolute value of the Normal draws.

draw(SVG(16cm, 8cm), 
     plot(x=1:length(gaussian_walk_positive), 
          y=gaussian_walk_positive, Geom.line))
{% endhighlight %}

<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     xmlns:gadfly="http://www.gadflyjl.org/ns"
     version="1.2"
     width="160mm" height="80mm" viewBox="0 0 160 80"
     stroke="none"
     fill="#000000"
     stroke-width="0.3"
     font-size="3.88"
>
<g class="plotroot xscalable yscalable" id="fig-f24e2be99f9a43d480d213d1b663b7fb-element-1">
  <g font-size="3.88" font-family="'PT Sans','Helvetica Neue','Helvetica',sans-serif" fill="#564A55" stroke="#000000" stroke-opacity="0.000" id="fig-f24e2be99f9a43d480d213d1b663b7fb-element-2">
    <text x="86.41" y="72" text-anchor="middle">x</text>
  </g>
  <g class="guide xlabels" font-size="2.82" font-family="'PT Sans Caption','Helvetica Neue','Helvetica',sans-serif" fill="#6C606B" id="fig-f24e2be99f9a43d480d213d1b663b7fb-element-3">
    <text x="19.83" y="64.39" text-anchor="middle">0</text>
    <text x="86.41" y="64.39" text-anchor="middle">50</text>
    <text x="153" y="64.39" text-anchor="middle">100</text>
  </g>
  <g clip-path="url(#fig-f24e2be99f9a43d480d213d1b663b7fb-element-5)" id="fig-f24e2be99f9a43d480d213d1b663b7fb-element-4">
    <g pointer-events="visible" opacity="1" fill="#000000" fill-opacity="0.000" stroke="#000000" stroke-opacity="0.000" class="guide background" id="fig-f24e2be99f9a43d480d213d1b663b7fb-element-6">
      <rect x="17.83" y="5" width="137.17" height="55.72"/>
    </g>
    <g class="guide ygridlines xfixed" stroke-dasharray="0.5,0.5" stroke-width="0.2" stroke="#D0D0E0" id="fig-f24e2be99f9a43d480d213d1b663b7fb-element-7">
      <path fill="none" d="M17.83,58.72 L 155 58.72"/>
      <path fill="none" d="M17.83,32.86 L 155 32.86"/>
      <path fill="none" d="M17.83,7 L 155 7"/>
    </g>
    <g class="guide xgridlines yfixed" stroke-dasharray="0.5,0.5" stroke-width="0.2" stroke="#D0D0E0" id="fig-f24e2be99f9a43d480d213d1b663b7fb-element-8">
      <path fill="none" d="M19.83,5 L 19.83 60.72"/>
      <path fill="none" d="M86.41,5 L 86.41 60.72"/>
      <path fill="none" d="M153,5 L 153 60.72"/>
    </g>
    <g class="plotpanel" id="fig-f24e2be99f9a43d480d213d1b663b7fb-element-9">
      <g stroke-width="0.3" fill="#000000" fill-opacity="0.000" class="geometry" stroke="#00BFFF" id="fig-f24e2be99f9a43d480d213d1b663b7fb-element-10">
        <path fill="none" d="M21.16,58.2 L 22.49 57.9 23.82 57.82 25.15 56.54 26.48 55.96 27.82 55.54 29.15 55.34 30.48 55.25 31.81 55.21 33.14 54.37 34.47 54.19 35.81 53.78 37.14 53.61 38.47 52.99 39.8 52.69 41.13 51.82 42.47 51.49 43.8 51.46 45.13 50.96 46.46 50.75 47.79 50.74 49.12 50.04 50.46 50.04 51.79 49.35 53.12 49.16 54.45 49.04 55.78 48.92 57.11 47.71 58.45 47.61 59.78 47.59 61.11 47.52 62.44 45.81 63.77 45.26 65.11 45.05 66.44 44.23 67.77 44.19 69.1 43.26 70.43 42.79 71.76 42.18 73.1 41.31 74.43 40.42 75.76 39.87 77.09 39.57 78.42 38.55 79.75 38 81.09 36.9 82.42 36.48 83.75 36.23 85.08 36.05 86.41 35.5 87.74 35.43 89.08 35.04 90.41 34.65 91.74 34.02 93.07 33.61 94.4 32.85 95.74 32.11 97.07 32.08 98.4 31.06 99.73 30.72 101.06 30.27 102.39 29.53 103.73 29.51 105.06 28.9 106.39 28.76 107.72 27.99 109.05 27.26 110.38 26.16 111.72 25.65 113.05 25.5 114.38 25.25 115.71 24.96 117.04 24.74 118.37 24.49 119.71 24.46 121.04 23.82 122.37 23.24 123.7 22.95 125.03 22.81 126.37 21.32 127.7 20.65 129.03 20.01 130.36 19.19 131.69 18.95 133.02 18.41 134.36 18.13 135.69 17.55 137.02 17.1 138.35 17.06 139.68 17.03 141.01 17.01 142.35 17 143.68 16.9 145.01 16.21 146.34 16.17 147.67 15.7 149 15.7 150.34 15.59 151.67 15.51 153 15.1"/>
      </g>
    </g>
  </g>
  <g class="guide ylabels" font-size="2.82" font-family="'PT Sans Caption','Helvetica Neue','Helvetica',sans-serif" fill="#6C606B" id="fig-f24e2be99f9a43d480d213d1b663b7fb-element-11">
    <text x="16.83" y="58.72" text-anchor="end" dy="0.35em">0</text>
    <text x="16.83" y="32.86" text-anchor="end" dy="0.35em">50</text>
    <text x="16.83" y="7" text-anchor="end" dy="0.35em">100</text>
  </g>
  <g font-size="3.88" font-family="'PT Sans','Helvetica Neue','Helvetica',sans-serif" fill="#564A55" stroke="#000000" stroke-opacity="0.000" id="fig-f24e2be99f9a43d480d213d1b663b7fb-element-12">
    <text x="8.81" y="32.86" text-anchor="end" dy="0.35em">y</text>
  </g>
</g>
<defs>
<clipPath id="fig-f24e2be99f9a43d480d213d1b663b7fb-element-5">
  <path d="M17.83,5 L 155 5 155 60.72 17.83 60.72" />
</clipPath
></defs>
</svg>

Note how nice it was to take advantage of Julia's vectorized array operations.

One more scenario that adds an additional twist.
Suppose we want to model count data as a function of time and, for reasons related to the process, the count data carries some "memory."
That is, there are trends in the counts due to the underlying data set (for example, number of tweets during the Oscars).
We can coarsely model this with an integer random walk, but there are a couple of caveats:

* Counts can't go below zero.
* Trends can go down.

We can deal with trends going down by drawing from random integers between, say, -3 and 3.
The counts below zero is where things get dicey because that condition actually _does_ depend on the position.
Luckily, it's an easy one - we just modify our reducer to be slightly aware of the value.

{% highlight julia %}
count_walk =
reduce((a,x) -> [a max(0, a[end] + x)],
[0],
rand(DiscreteUniform(-3,3), 99));

draw(SVG(16cm, 8cm), plot(x=1:length(count_walk), y=count_walk, Geom.line))
{% endhighlight %}

<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     xmlns:gadfly="http://www.gadflyjl.org/ns"
     version="1.2"
     width="160mm" height="80mm" viewBox="0 0 160 80"
     stroke="none"
     fill="#000000"
     stroke-width="0.3"
     font-size="3.88"
>
<g class="plotroot xscalable yscalable" id="fig-e5de7f4a665947b28eb9d7619ba154f4-element-1">
  <g font-size="3.88" font-family="'PT Sans','Helvetica Neue','Helvetica',sans-serif" fill="#564A55" stroke="#000000" stroke-opacity="0.000" id="fig-e5de7f4a665947b28eb9d7619ba154f4-element-2">
    <text x="85.58" y="72" text-anchor="middle">x</text>
  </g>
  <g class="guide xlabels" font-size="2.82" font-family="'PT Sans Caption','Helvetica Neue','Helvetica',sans-serif" fill="#6C606B" id="fig-e5de7f4a665947b28eb9d7619ba154f4-element-3">
    <text x="18.15" y="64.39" text-anchor="middle">0</text>
    <text x="85.58" y="64.39" text-anchor="middle">50</text>
    <text x="153" y="64.39" text-anchor="middle">100</text>
  </g>
  <g clip-path="url(#fig-e5de7f4a665947b28eb9d7619ba154f4-element-5)" id="fig-e5de7f4a665947b28eb9d7619ba154f4-element-4">
    <g pointer-events="visible" opacity="1" fill="#000000" fill-opacity="0.000" stroke="#000000" stroke-opacity="0.000" class="guide background" id="fig-e5de7f4a665947b28eb9d7619ba154f4-element-6">
      <rect x="16.15" y="5" width="138.85" height="55.72"/>
    </g>
    <g class="guide ygridlines xfixed" stroke-dasharray="0.5,0.5" stroke-width="0.2" stroke="#D0D0E0" id="fig-e5de7f4a665947b28eb9d7619ba154f4-element-7">
      <path fill="none" d="M16.15,58.72 L 155 58.72"/>
      <path fill="none" d="M16.15,50.1 L 155 50.1"/>
      <path fill="none" d="M16.15,41.48 L 155 41.48"/>
      <path fill="none" d="M16.15,32.86 L 155 32.86"/>
      <path fill="none" d="M16.15,24.24 L 155 24.24"/>
      <path fill="none" d="M16.15,15.62 L 155 15.62"/>
      <path fill="none" d="M16.15,7 L 155 7"/>
    </g>
    <g class="guide xgridlines yfixed" stroke-dasharray="0.5,0.5" stroke-width="0.2" stroke="#D0D0E0" id="fig-e5de7f4a665947b28eb9d7619ba154f4-element-8">
      <path fill="none" d="M18.15,5 L 18.15 60.72"/>
      <path fill="none" d="M85.58,5 L 85.58 60.72"/>
      <path fill="none" d="M153,5 L 153 60.72"/>
    </g>
    <g class="plotpanel" id="fig-e5de7f4a665947b28eb9d7619ba154f4-element-9">
      <g stroke-width="0.3" fill="#000000" fill-opacity="0.000" class="geometry" stroke="#00BFFF" id="fig-e5de7f4a665947b28eb9d7619ba154f4-element-10">
        <path fill="none" d="M19.5,58.72 L 20.85 58.72 22.2 56.13 23.55 55.27 24.89 56.13 26.24 53.54 27.59 52.68 28.94 50.1 30.29 47.51 31.64 49.23 32.99 49.23 34.33 46.65 35.68 45.79 37.03 45.79 38.38 44.92 39.73 44.06 41.08 41.48 42.43 42.34 43.77 42.34 45.12 44.06 46.47 44.92 47.82 43.2 49.17 41.48 50.52 41.48 51.86 39.75 53.21 41.48 54.56 44.06 55.91 44.92 57.26 44.06 58.61 42.34 59.96 39.75 61.3 38.89 62.65 37.17 64 36.31 65.35 36.31 66.7 36.31 68.05 33.72 69.39 31.13 70.74 32 72.09 32.86 73.44 32.86 74.79 34.58 76.14 32.86 77.49 32 78.83 33.72 80.18 36.31 81.53 35.44 82.88 38.03 84.23 36.31 85.58 37.17 86.92 38.89 88.27 40.61 89.62 40.61 90.97 42.34 92.32 44.92 93.67 44.92 95.02 44.92 96.36 42.34 97.71 39.75 99.06 37.17 100.41 36.31 101.76 34.58 103.11 33.72 104.45 32.86 105.8 34.58 107.15 35.44 108.5 34.58 109.85 37.17 111.2 34.58 112.55 37.17 113.89 35.44 115.24 33.72 116.59 31.13 117.94 32 119.29 29.41 120.64 30.27 121.99 28.55 123.33 25.96 124.68 24.24 126.03 25.1 127.38 26.82 128.73 25.96 130.08 25.1 131.42 25.96 132.77 25.96 134.12 24.24 135.47 24.24 136.82 21.65 138.17 23.38 139.52 20.79 140.86 21.65 142.21 19.93 143.56 17.34 144.91 14.76 146.26 15.62 147.61 18.2 148.95 18.2 150.3 16.48 151.65 18.2 153 19.93"/>
      </g>
    </g>
  </g>
  <g class="guide ylabels" font-size="2.82" font-family="'PT Sans Caption','Helvetica Neue','Helvetica',sans-serif" fill="#6C606B" id="fig-e5de7f4a665947b28eb9d7619ba154f4-element-11">
    <text x="15.15" y="58.72" text-anchor="end" dy="0.35em">0</text>
    <text x="15.15" y="50.1" text-anchor="end" dy="0.35em">10</text>
    <text x="15.15" y="41.48" text-anchor="end" dy="0.35em">20</text>
    <text x="15.15" y="32.86" text-anchor="end" dy="0.35em">30</text>
    <text x="15.15" y="24.24" text-anchor="end" dy="0.35em">40</text>
    <text x="15.15" y="15.62" text-anchor="end" dy="0.35em">50</text>
    <text x="15.15" y="7" text-anchor="end" dy="0.35em">60</text>
  </g>
  <g font-size="3.88" font-family="'PT Sans','Helvetica Neue','Helvetica',sans-serif" fill="#564A55" stroke="#000000" stroke-opacity="0.000" id="fig-e5de7f4a665947b28eb9d7619ba154f4-element-12">
    <text x="8.81" y="32.86" text-anchor="end" dy="0.35em">y</text>
  </g>
</g>
<defs>
<clipPath id="fig-e5de7f4a665947b28eb9d7619ba154f4-element-5">
  <path d="M16.15,5 L 155 5 155 60.72 16.15 60.72" />
</clipPath
></defs>
</svg>

Let's get really generic with this.
Our "recipe" is as follows:

- A starting point.
- The length of the walk.
- A distribution for the random elements.
- A transformation to apply to the random elements.
- A function to apply to the new value in the reducer (function of current position).

{% highlight julia %}
function randomWalkReduce(
    start::Number,                 # Starting point.
    walkLength::Integer,           # Length of the walk.
    distribution::Distribution,    # Distribution to draw from.
    stepTransformation::Function,  # Transformation applied to each step.
    valueTransformation::Function) # Transformation applied to each value.
    
    return reduce(
        (a,x) -> [a valueTransformation(a[end] + x)],
        [start],
        map(stepTransformation, rand(distribution, walkLength - 1)));
end;
{% endhighlight %}

Now our counting example looks like the following:

{% highlight julia %}
srand(0) # For future comparison with an alternate implementation.
count_walk_two = randomWalkReduce(0, 100, DiscreteUniform(-3, 3), identity, x -> max(0, x))

draw(SVG(16cm, 8cm), plot(x=1:length(count_walk_two), y=count_walk_two, Geom.line))
{% endhighlight %}

<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     xmlns:gadfly="http://www.gadflyjl.org/ns"
     version="1.2"
     width="160mm" height="80mm" viewBox="0 0 160 80"
     stroke="none"
     fill="#000000"
     stroke-width="0.3"
     font-size="3.88"
>
<g class="plotroot xscalable yscalable" id="fig-b66feb9b8a934d77acc8def385298957-element-1">
  <g font-size="3.88" font-family="'PT Sans','Helvetica Neue','Helvetica',sans-serif" fill="#564A55" stroke="#000000" stroke-opacity="0.000" id="fig-b66feb9b8a934d77acc8def385298957-element-2">
    <text x="85.58" y="72" text-anchor="middle">x</text>
  </g>
  <g class="guide xlabels" font-size="2.82" font-family="'PT Sans Caption','Helvetica Neue','Helvetica',sans-serif" fill="#6C606B" id="fig-b66feb9b8a934d77acc8def385298957-element-3">
    <text x="18.15" y="64.39" text-anchor="middle">0</text>
    <text x="85.58" y="64.39" text-anchor="middle">50</text>
    <text x="153" y="64.39" text-anchor="middle">100</text>
  </g>
  <g clip-path="url(#fig-b66feb9b8a934d77acc8def385298957-element-5)" id="fig-b66feb9b8a934d77acc8def385298957-element-4">
    <g pointer-events="visible" opacity="1" fill="#000000" fill-opacity="0.000" stroke="#000000" stroke-opacity="0.000" class="guide background" id="fig-b66feb9b8a934d77acc8def385298957-element-6">
      <rect x="16.15" y="5" width="138.85" height="55.72"/>
    </g>
    <g class="guide ygridlines xfixed" stroke-dasharray="0.5,0.5" stroke-width="0.2" stroke="#D0D0E0" id="fig-b66feb9b8a934d77acc8def385298957-element-7">
      <path fill="none" d="M16.15,58.71 L 155 58.71"/>
      <path fill="none" d="M16.15,45.79 L 155 45.79"/>
      <path fill="none" d="M16.15,32.86 L 155 32.86"/>
      <path fill="none" d="M16.15,19.93 L 155 19.93"/>
      <path fill="none" d="M16.15,7 L 155 7"/>
    </g>
    <g class="guide xgridlines yfixed" stroke-dasharray="0.5,0.5" stroke-width="0.2" stroke="#D0D0E0" id="fig-b66feb9b8a934d77acc8def385298957-element-8">
      <path fill="none" d="M18.15,5 L 18.15 60.72"/>
      <path fill="none" d="M85.58,5 L 85.58 60.72"/>
      <path fill="none" d="M153,5 L 153 60.72"/>
    </g>
    <g class="plotpanel" id="fig-b66feb9b8a934d77acc8def385298957-element-9">
      <g stroke-width="0.3" fill="#000000" fill-opacity="0.000" class="geometry" stroke="#00BFFF" id="fig-b66feb9b8a934d77acc8def385298957-element-10">
        <path fill="none" d="M19.5,58.71 L 20.85 58.71 22.2 58.71 23.55 56.13 24.89 58.71 26.24 58.71 27.59 58.71 28.94 53.54 30.29 58.71 31.64 53.54 32.99 50.96 34.33 50.96 35.68 43.2 37.03 45.79 38.38 45.79 39.73 40.61 41.08 38.03 42.43 40.61 43.77 40.61 45.12 32.86 46.47 30.27 47.82 32.86 49.17 38.03 50.52 32.86 51.86 35.44 53.21 27.69 54.56 27.69 55.91 19.93 57.26 17.34 58.61 12.17 59.96 19.93 61.3 14.76 62.65 17.34 64 14.76 65.35 22.51 66.7 22.51 68.05 25.1 69.39 17.34 70.74 22.51 72.09 25.1 73.44 19.93 74.79 14.76 76.14 19.93 77.49 25.1 78.83 22.51 80.18 17.34 81.53 9.59 82.88 12.17 84.23 14.76 85.58 19.93 86.92 22.51 88.27 27.69 89.62 22.51 90.97 14.76 92.32 14.76 93.67 9.59 95.02 12.17 96.36 19.93 97.71 19.93 99.06 14.76 100.41 19.93 101.76 19.93 103.11 27.69 104.45 19.93 105.8 27.69 107.15 35.44 108.5 35.44 109.85 38.03 111.2 45.79 112.55 40.61 113.89 40.61 115.24 35.44 116.59 27.69 117.94 25.1 119.29 32.86 120.64 35.44 121.99 38.03 123.33 40.61 124.68 40.61 126.03 38.03 127.38 43.2 128.73 45.79 130.08 38.03 131.42 40.61 132.77 48.37 134.12 53.54 135.47 50.96 136.82 45.79 138.17 50.96 139.52 50.96 140.86 56.13 142.21 56.13 143.56 58.71 144.91 50.96 146.26 58.71 147.61 58.71 148.95 56.13 150.3 58.71 151.65 58.71 153 58.71"/>
      </g>
    </g>
  </g>
  <g class="guide ylabels" font-size="2.82" font-family="'PT Sans Caption','Helvetica Neue','Helvetica',sans-serif" fill="#6C606B" id="fig-b66feb9b8a934d77acc8def385298957-element-11">
    <text x="15.15" y="58.71" text-anchor="end" dy="0.35em">0</text>
    <text x="15.15" y="45.79" text-anchor="end" dy="0.35em">5</text>
    <text x="15.15" y="32.86" text-anchor="end" dy="0.35em">10</text>
    <text x="15.15" y="19.93" text-anchor="end" dy="0.35em">15</text>
    <text x="15.15" y="7" text-anchor="end" dy="0.35em">20</text>
  </g>
  <g font-size="3.88" font-family="'PT Sans','Helvetica Neue','Helvetica',sans-serif" fill="#564A55" stroke="#000000" stroke-opacity="0.000" id="fig-b66feb9b8a934d77acc8def385298957-element-12">
    <text x="8.81" y="32.86" text-anchor="end" dy="0.35em">y</text>
  </g>
</g>
<defs>
<clipPath id="fig-b66feb9b8a934d77acc8def385298957-element-5">
  <path d="M16.15,5 L 155 5 155 60.72 16.15 60.72" />
</clipPath
></defs>
</svg>



Here's what it looks like with the loops.

{% highlight julia %}
function randomWalkLoop(start::Number, 
                        walkLength::Integer, 
                        distribution::Distribution,
                        stepTransformation::Function,
                        valueTransformation::Function)
    
    walk = [start; zeros(walkLength - 1)]
    
    for ii=2:length(walk)
        walk[ii] = valueTransformation(
            walk[ii-1] + 
            stepTransformation(rand(distribution)))
    end
    
    return walk
end;                 


srand(0)
count_walk_three = randomWalkLoop(0, 100, DiscreteUniform(-3, 3), identity, x -> max(0, x));

draw(SVG(16cm, 8cm), plot(x=1:length(count_walk_three), y=count_walk_three, Geom.line))
{% endhighlight %}


<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg"
     xmlns:xlink="http://www.w3.org/1999/xlink"
     xmlns:gadfly="http://www.gadflyjl.org/ns"
     version="1.2"
     width="160mm" height="80mm" viewBox="0 0 160 80"
     stroke="none"
     fill="#000000"
     stroke-width="0.3"
     font-size="3.88"
>
<g class="plotroot xscalable yscalable" id="fig-b66feb9b8a934d77acc8def385298957-element-1">
  <g font-size="3.88" font-family="'PT Sans','Helvetica Neue','Helvetica',sans-serif" fill="#564A55" stroke="#000000" stroke-opacity="0.000" id="fig-b66feb9b8a934d77acc8def385298957-element-2">
    <text x="85.58" y="72" text-anchor="middle">x</text>
  </g>
  <g class="guide xlabels" font-size="2.82" font-family="'PT Sans Caption','Helvetica Neue','Helvetica',sans-serif" fill="#6C606B" id="fig-b66feb9b8a934d77acc8def385298957-element-3">
    <text x="18.15" y="64.39" text-anchor="middle">0</text>
    <text x="85.58" y="64.39" text-anchor="middle">50</text>
    <text x="153" y="64.39" text-anchor="middle">100</text>
  </g>
  <g clip-path="url(#fig-b66feb9b8a934d77acc8def385298957-element-5)" id="fig-b66feb9b8a934d77acc8def385298957-element-4">
    <g pointer-events="visible" opacity="1" fill="#000000" fill-opacity="0.000" stroke="#000000" stroke-opacity="0.000" class="guide background" id="fig-b66feb9b8a934d77acc8def385298957-element-6">
      <rect x="16.15" y="5" width="138.85" height="55.72"/>
    </g>
    <g class="guide ygridlines xfixed" stroke-dasharray="0.5,0.5" stroke-width="0.2" stroke="#D0D0E0" id="fig-b66feb9b8a934d77acc8def385298957-element-7">
      <path fill="none" d="M16.15,58.71 L 155 58.71"/>
      <path fill="none" d="M16.15,45.79 L 155 45.79"/>
      <path fill="none" d="M16.15,32.86 L 155 32.86"/>
      <path fill="none" d="M16.15,19.93 L 155 19.93"/>
      <path fill="none" d="M16.15,7 L 155 7"/>
    </g>
    <g class="guide xgridlines yfixed" stroke-dasharray="0.5,0.5" stroke-width="0.2" stroke="#D0D0E0" id="fig-b66feb9b8a934d77acc8def385298957-element-8">
      <path fill="none" d="M18.15,5 L 18.15 60.72"/>
      <path fill="none" d="M85.58,5 L 85.58 60.72"/>
      <path fill="none" d="M153,5 L 153 60.72"/>
    </g>
    <g class="plotpanel" id="fig-b66feb9b8a934d77acc8def385298957-element-9">
      <g stroke-width="0.3" fill="#000000" fill-opacity="0.000" class="geometry" stroke="#00BFFF" id="fig-b66feb9b8a934d77acc8def385298957-element-10">
        <path fill="none" d="M19.5,58.71 L 20.85 58.71 22.2 58.71 23.55 56.13 24.89 58.71 26.24 58.71 27.59 58.71 28.94 53.54 30.29 58.71 31.64 53.54 32.99 50.96 34.33 50.96 35.68 43.2 37.03 45.79 38.38 45.79 39.73 40.61 41.08 38.03 42.43 40.61 43.77 40.61 45.12 32.86 46.47 30.27 47.82 32.86 49.17 38.03 50.52 32.86 51.86 35.44 53.21 27.69 54.56 27.69 55.91 19.93 57.26 17.34 58.61 12.17 59.96 19.93 61.3 14.76 62.65 17.34 64 14.76 65.35 22.51 66.7 22.51 68.05 25.1 69.39 17.34 70.74 22.51 72.09 25.1 73.44 19.93 74.79 14.76 76.14 19.93 77.49 25.1 78.83 22.51 80.18 17.34 81.53 9.59 82.88 12.17 84.23 14.76 85.58 19.93 86.92 22.51 88.27 27.69 89.62 22.51 90.97 14.76 92.32 14.76 93.67 9.59 95.02 12.17 96.36 19.93 97.71 19.93 99.06 14.76 100.41 19.93 101.76 19.93 103.11 27.69 104.45 19.93 105.8 27.69 107.15 35.44 108.5 35.44 109.85 38.03 111.2 45.79 112.55 40.61 113.89 40.61 115.24 35.44 116.59 27.69 117.94 25.1 119.29 32.86 120.64 35.44 121.99 38.03 123.33 40.61 124.68 40.61 126.03 38.03 127.38 43.2 128.73 45.79 130.08 38.03 131.42 40.61 132.77 48.37 134.12 53.54 135.47 50.96 136.82 45.79 138.17 50.96 139.52 50.96 140.86 56.13 142.21 56.13 143.56 58.71 144.91 50.96 146.26 58.71 147.61 58.71 148.95 56.13 150.3 58.71 151.65 58.71 153 58.71"/>
      </g>
    </g>
  </g>
  <g class="guide ylabels" font-size="2.82" font-family="'PT Sans Caption','Helvetica Neue','Helvetica',sans-serif" fill="#6C606B" id="fig-b66feb9b8a934d77acc8def385298957-element-11">
    <text x="15.15" y="58.71" text-anchor="end" dy="0.35em">0</text>
    <text x="15.15" y="45.79" text-anchor="end" dy="0.35em">5</text>
    <text x="15.15" y="32.86" text-anchor="end" dy="0.35em">10</text>
    <text x="15.15" y="19.93" text-anchor="end" dy="0.35em">15</text>
    <text x="15.15" y="7" text-anchor="end" dy="0.35em">20</text>
  </g>
  <g font-size="3.88" font-family="'PT Sans','Helvetica Neue','Helvetica',sans-serif" fill="#564A55" stroke="#000000" stroke-opacity="0.000" id="fig-b66feb9b8a934d77acc8def385298957-element-12">
    <text x="8.81" y="32.86" text-anchor="end" dy="0.35em">y</text>
  </g>
</g>
<defs>
<clipPath id="fig-b66feb9b8a934d77acc8def385298957-element-5">
  <path d="M16.15,5 L 155 5 155 60.72 16.15 60.72" />
</clipPath
></defs>
</svg>



There is some question as to whether there's a difference in runtime between the two.
After all, the loop version preallocates the values.
If you're running this, it will take a while. 
I'll let you guess how much faster one is than the other.

{% highlight julia %}
@time randomWalkReduce(0, int64(1e5), DiscreteUniform(-3, 3), identity, x -> max(0, x));
@time randomWalkLoop(  0, int64(1e5), DiscreteUniform(-3, 3), identity, x -> max(0, x));
{% endhighlight %}

{% highlight bash %}
elapsed time: 82.042571178 seconds (40215415632 bytes allocated, 64.49% gc time)
elapsed time: 0.125647666 seconds (14378544 bytes allocated, 46.76% gc time)
{% endhighlight %}

All of those extra allocations and gc time really _really_ killed the reduce version.
That said, I don't think the development of `randomWalkReduce` was a waste of time.
After all, it was trivially obvious to figure out the generic set of arguments and transformations needed, as well as where to put them.
From there `randomWalkLoop` was pretty straightforward, and is just as flexible.
I'm not confident that starting with the loop would have gotten me to the solution in a reasonably logical way.

Moral of the story: maybe start with the simplest solution, but don't be afraid to loop it out for speed once it's locked down.

To run the notebook yourself, grab it [here]({{site.url}}/notebooks/).
