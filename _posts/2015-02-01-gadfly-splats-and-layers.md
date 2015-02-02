---
title: "Gadfly, Splats, and Layers"
tags: notebook julia
categories: programming
layout: post
---

The [Gadfly](http://gadflyjl.org/) package is pretty much the coolest thing
since sliced bread when it comes to plotting in Julia.
While it's designed for plotting statistical graphics, having it's roots in
Hadley Wickham's ggplot2 for R, it can definitely serve to make some really nice
plots of any kind.

This tutorial will focus on using the layering functionality to plot multiple
lines of data on a single plot conveniently using the splat (`...`) operator.
I will attempt to use the word splat as many times as possible because it's
great.

I will assume you know the basics of Gadfly and can work with layers.
You can see more [here](http://gadflyjl.org/#layers), but basically you make a
layer for each aesthetic you want to add.
So if you want lines AND points, you use layers.
You can also use layers for multiple lines, which is what we're doing here.

There are some prerequisite packages for running the notebook if that's what
you're into.
Obviously you will need Gadfly.
Install with

{% highlight julia %}

Pkg.add("Gadfly")

{% endhighlight %}

You will also need RungeKutta, DynamicalSystems, and ColorBrewer.
Those you can install with the following commands:

{% highlight julia %}

Pkg.clone("git://github.com/timothyrenner/RungeKutta.jl.git")
Pkg.clone("git://github.com/timothyrenner/DynamicalSystems.jl.git")
Pkg.clone("git://github.com/timothyrenner/ColorBrewer.jl.git")

{% endhighlight %}

Those three are written by yours truly.

{% highlight julia %}

using Gadfly
using DynamicalSystems
using RungeKutta
using ColorBrewer

{% endhighlight %}

What we're going to do is plot ten different orbits of a damped harmonic
oscillator on the same plot to make a pretty picture.

The Math
--------

First, we need to set up the equations for solving.
The `harmonicOscillator` function in DynamicalSystems is the starting point.
It's going to define the function we need to feed to the solver.

{% highlight julia %}

# Set up the ODEs.
ω0 = 2.5;
β = 1.0; # β is the damping coefficient.

# harmonicOscillator from the DynamicalSystems package.
f = harmonicOscillator(ω0, beta=β);

{% endhighlight %}

Next, we need to set up the initial conditions.
For this plot, we can vary the initial position, and start with zero initial
velocity.
Don't sweat these details too much, they're just needed to get a set of
solutions we can plot.

{% highlight julia %}

x0s = zeros(2,11);
x0s[1,:] = [0.0:0.1:1.0];
h = 0.0001;
n = 100000;

{% endhighlight %}

Next, we need a place to put the solution.
We'll just save the positions and time for these plots, and ignore the velocity.

{% highlight julia %}

x = zeros(11, n+1); # Each column is a different x0.
t = zeros(n+1); # The times will be the same for all x0s.

for ii=1:11
    
    # Solve the ODE with an order 4 RK (from the RungeKutta package).
    tnew, xnew = rk4f(f, x0s[:,ii], 0.0, h, n);
    
    # Save the x solution.
    x[ii,:] = xnew[1,:];
    
    # Save the time only once.
    if ii==1
        t = tnew;
    end
end

{% endhighlight %}

Okay, all done with the math.
On to the point.

Splatting Layers
----------------

We've got 11 lines we want to plot all at once with Gadfly.
The naive way would be to write something like:

{% highlight julia %}

draw(PNG(24cm, 18cm), plot(
    layer(x=t, y=x[1,:], Geom.path),
    layer(x=t, y=x[2,:], Geom.path), # This is getting old...
    layer(x=t, y=x[3,:], Geom.path), # Srsly
    layer(x=t, y=x[4,:], Geom.path), # F**k it I'm getting a beer.

{% endhighlight %}

No need to fear, this tedium is unnecessary!
The trick is to splat an array of layers into the plot function.

***But wait!*** you say, ***if you have to make an array of layers individually,
aren't you ... not saving time?***

The trick to making *that* easy is to use a comprehension.

##### BEHOLD

{% highlight julia %}

# Create the color palette. This is a function in ColorBrewer.
colors = palette("PRGn", 11);

# Make the layers with a comprehension!
layers = [layer(
    x=t, y=x[ii,:], 
    Geom.path, 
    Theme(default_color=colors[ii])) 
    for ii in 1:11];

{% endhighlight %}

What I did above was just create an array of layers based on our solution matrix
`x` and the color palette.
You could also have started with an empty array of layers and filled it in a
`for` loop, but I think comprehensions are cleaner.

Now that we've got our layers ready, it's time for the plot.
Gadfly's plot function doesn't actually like that our layers are in an array.
If you try it you'll get an error.
That's where the splat (`...`) comes in.

See, when we splat the array, it's expanded into a whole bunch of *individual*
arguments, which the plot function _will_ take.

{% highlight julia %}

# Create a blank theme for white backgrounds. Because ... art.
blankTheme = Theme(
    grid_color=color("white"), 
    panel_fill=color("white"),
    major_label_color=color("white"), 
    minor_label_color=color("white"));

# Now draw the plot (it takes a bit). 
# Note how easy it is with the splat.
draw(PNG(24cm, 18cm), plot(layers..., blankTheme))

{% endhighlight %}

![png]({{ site.url }}/images/gadfly-splats-and-layers/damped-harmonic-plot.png)


And there we have it - a nifty (in my opinion) picture with a lot of lines in
Gadfly without a lot of pain.
Unless you consider ODEs pain.

You can read more about splats in the Julia documentation
[here](http://docs.julialang.org/en/release-0.3/manual/functions/#varargs-
functions).
If you do, you'll notice they call it "splice."
Everybody else calls it splat, for reasons related to the word's awesomeness.

If you want to play around with the notebook, grab it [here]({{ site.url }}/notebooks/).

tl;dr
-----

Use a comprehension to create layers for a Gadfly plot and splat them in the
plot function.

A browser find has revealed to me that I managed to use the word "splat" eleven
times in this post.
Well, twelve times now.
