---
title: Dammit, R
categories: rant
tags: rant,rstats
layout: post
---

A week or so ago, I was working on the class project for an online course, Statistical Inference, taught by Brian Caffo at Johns Hopkins.
Now I've got nothing but great things to say about the class - it's one of the best I've taken through Coursera.
That said, writing a project with R markdown led me on a little ... we'll call it ... adventure.
What follows is a blow by blow account of my attempting to figure out how to format print three lines of text.
There will be strong language.

I know what you're thinking - seriously, how hard is it to print three formatted lines of text?
Here's how hard it is in python.

{% highlight python %}
print("Theoretical variance: %f"%1.0)
print("Experimental variance: %f"%0.5)
print("Difference: %f"%0.5)

    Theoretical variance: 1.000000
    Experimental variance: 0.500000
    Difference: 0.500000
{% endhighlight %}

And all three of these _print_ next to one another when the results are displayed in an IPython notebook.
Boom.
Done.

Here it is in Julia.

{% highlight julia %}
@printf "Theoretical variance: %f" 1.0
@printf "Experimental variance: %f" 0.5
@printf "Difference: %f" 0.5

    Theoretical variance: 1.000000
    Experimental variance: 0.500000
    Difference: 0.500000
{% endhighlight %}

So Julia's a little funky because it's a macro, but it's predictable.
Here's the real catch when working with R markdown.
_All three of these strings have to be displayed with a single R print statement._
"Why?" you might ask.
Well, Rick, they have to be on the same line because when R markdown gets rendered it renders output _inline_, so each `print("...")` gets interlaced with it's own output when it renders, so a pair of print statements:

{% highlight r %}
print("Hi")
print("There")
{% endhighlight %}

gives us

{% highlight r %}
print("Hi")

  "Hi"

print("There")

  "There"
{% endhighlight %}

Aside from this being really ugly, it's a monster pain in the ass.

My first thought was to use string concatenation.

{% highlight r %}
print("Theoretical variance: " + 1.0)

    Error in "Theoretical variance: " + 1.0 : non-numeric argument to binary operator
{% endhighlight %}


Fair enough.
I actually kind-of admired R for this a little.
Adding a number to a string seems silly (****cough**** _Java_ ****cough****).
I'll try a manual concatenation.
Keep in mind the numbers were actually variables in my project, so I couldn't just bake them in manually.

{% highlight r %}
print(cat("Theoretical variance: ", 1.0))

    "Theoretical variance: 1NULL"
{% endhighlight %}


WAT.
----

At this point I have to hit Google.
I ran into this answer on [StackOverflow](http://stackoverflow.com/questions/4055762/in-r-can-i-stop-printcat-from-returning-null-and-why-does-catfoo-ret).
Basically, it was a "read the manual" answer.
Okay, so `cat` returns `NULL`.
Fair enough.

I'll cast it to a string and concatenate them with `c`.

{% highlight r %}
print(c("Theoretical variance: ", toString(1.0)))

    "Theoretical variance: " "1.0"
{% endhighlight %}


Well, that's just fucking great.
Concatenating two strings makes them a vector of two strings.

Now at this point, I realize I need to just use `sprintf`.

{% highlight r %}
print(sprintf("Theoretical variance: %f", 1.0))

    "Theoretical variance: 1.000000"
{% endhighlight %}


Success!
Oh wait.
Forgot the other two.
A little googling gives me the `paste` function, which "[concatenates] vectors after converting to character."
Sounds perfect.

{% highlight r %}
print(paste(
  sprintf("Theoretical variance: %f", 1.0),
  sprintf("Experimental variance: %f", 0.5),
  sprintf("Difference: %f", 0.5),
  sep="\n"))

    "Theoretical variance: 1.000000\nExperimental variance: 0.500000\nDifference: 0.500000"
{% endhighlight %}


![Seriously]({{ site.url }}/images/dammit-r-part-1/picard_why_the_fuck.png)

Fine.
I'll put them all in one `print` statement with a single sprintf and it'll be hideous but it's R and everything's hideous and I'm tired.

{% highlight r %}
print(sprintf("Theoretical variance: %f\nExperimental variance: %f\nDifference: %f",
    1.0, 0.5, 0.5))

    "Theoretical variance: 1.000000\nExperimental variance: 0.500000\nDifference: 0.500000"
{% endhighlight %}

ARE YOU FUCKING KIDDING ME?
===========================

To this day I have no idea why this happened or why this is the output.
Whatever the answer actually is, I'm about 90% certain it's going to piss me off even more.

Right before I enter into a hulk-like rage (which for me basically consists of vigorously typing on the keyboard) I realize I've already seen the answer.

Remember `cat`?

Here, ladies and gentlemen, is the solution:

{% highlight r %}
cat(sprintf("Theoretical variance: %f", 1.0),
    sprintf("Experimental variance: %f", 0.5),
    sprintf("Difference: %f", 0.5),
    sep="\n");

    Theoretical variance: 1.000000
    Experimental variance: 0.500000
    Difference: 0.500000
{% endhighlight %}

Take careful note that I just had to present a _solution_ to _printing three things onto the screen_.


And that's how you format print onto the screen in R.
