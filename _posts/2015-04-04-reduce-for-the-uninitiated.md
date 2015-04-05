---
title: "Reduce for the Uninitiated"
tags: python
categories: programming
layout: post
tweet_text: "Reduce for the Uninitiated."
---

I've been spending a lot of time learning functional programming lately.
Scala got me into it first, but it wasn't long before I shed my object-oriented background and started working in the land of expressions and immutable structures via Clojure.
After doing several problems on [exercism](http://exercism.io) I began to notice some pattern with a little function called `reduce`, which seemed to be popping up everywhere as a kind-of Swiss army knife for collections.
I started exploring deeper and it wasn't long before I started seeing words like lambda calculus, monads, and combinators.
I don't have a computer science background so I've been learning this as I go.
These are my thoughts on the basic _practical_ uses of reduce.
I plan on going deeper into the theory as I learn more.

As it turns out, reduce is a very prevalent function.
Here are some of the languages you can use it in (sometimes it's called `fold`, `accumulate`, or a [bunch of others](http://rosettacode.org/wiki/Reduce)):

* R
* Julia
* Clojure
* Scala
* Python
* Ruby
* Javascript
* Java
* C++

So reduce is everywhere, but what's it for?
Is it even worth using in languages that aren't Clojure and Scala?
That's what I'll explore here.
The examples will be in Python.

## tl;dr

Reduce can be used to loop over a collection with an _expression_ - something that returns a value - rather than a statement.

## The Basics

Reduce is a special kind of function called a _higher-order function_, which means it takes as an argument another function.
In functional programming, functions can be passed around just like any other variables.
Reduce takes a function and a collection of some kind, and returns a single value (which can be a collection).
We'll call this function the _reducer_.

The reducer needs to take two arguments: the first is an _accumulator_, the second is an element of the collection.
Reduce applies the function to each element of the collection and places the result in the accumulator for the next reducer call which is made on the next element of the collection.
This is done until the reducer has been applied to each element of the collection, resulting in a single value.
(Note this value can itself be a colleciton - more on that later).

Here's a simple (classic) example:

{% highlight python %}
reduce(lambda a, x: x + a, [1, 2, 3, 4, 5])

# 15
{% endhighlight %}

Here's how the sum is computed: the first element starts as the accumulator, and is added to the next element of the list.
That result is returned to serve as the next accumulator.
This is done until the list has been traversed.
Here are the function calls for each reducer in order:

{% highlight python %}
((((1 + 2) + 3) + 4) + 5)

# 15
{% endhighlight %}

What do you mean that's an incomprehensible mess?
Okay, here's the "iterative" version.
Wuss.

{% highlight python %}
(1 + 2) # 3

(3 + 3) # 6

(6 + 4) # 10

(10 + 5) # 15

# BTW I totally wrote this one first.
{% endhighlight %}

## Moar Powar!

By putting the value of the collection as the starting accumulator, we're limiting ourselves to reducers that return a value of the same type as the elements of the collection.
Thankfully, this need not be the case, as pretty much every implementation of reduce/fold I've ever seen allows for an argument that acts as the initial accumulator.
This is where reduce goes from a convenience to a weapon.
Check this out:

{% highlight python %}
def count_reducer(a, x):
    if x in a:
        a[x] += 1
    else:
        a[x] = 1
    return a

def frequencies(coll):
    return reduce(count_reducer, coll, {})
{% endhighlight %}

So what does our new `frequencies` function do?
It counts the distinct elements in the collection.

{% highlight python %}
frequencies(['a','a','b','a','c'])

# {'a':3, 'c':1, 'b':1}
{% endhighlight %}

List goes in, map comes out.
Pretty nice, huh?
Here's what this looks like as a loop:

{% highlight python %}
accumulator = {} # Note that the accumulator is in an invalid state here.
coll = ['a', 'a', 'b', 'a', 'c']
for val in coll:
    if val in accumulator:
        accumulator[val] += 1
    else:
        accumulator[val] = 1

# accumulator = {'a':3, 'c':1, 'b':1} 
{% endhighlight %}

So it's not actually more or less code (roughly speaking) as the reduce call when you drop in the `count_reducer` function, but reduce is a much _cleaner_ way to show it.
Why?
Well, think about what the accumulator's state _means_ when it's initialized.
Two things:

![](http://38.media.tumblr.com/fd15df8c46adc4d9581ee65ec723b1df/tumblr_mq3irduWJN1rlrip1o3_250.gif)
![](http://38.media.tumblr.com/2f3b461d98898d58304a79f83ac7f148/tumblr_mq3irduWJN1rlrip1o4_250.gif)

When we provide the statement `accumulator = {}`, we're just declaring a container to mutate until we get what we want.
The loop performs the mutation.

Here's a problem from [exercism](http://exercism.io) that requires the user to transcribe DNA to RNA.
Or maybe it's the other way around?
Anyway, this is the loop solution.

{% highlight python %}
dna = {'C':'G', 'G':'C', 'A':'U', 'T':'A'}
rna = ""
for d in "CGAT":
    rna += dna[d]

# rna => 'GCUA'
{% endhighlight %}

Now don't worry - the solution isn't _exactly_ what you need to solve the exercism problem, but it's a really illustrating example.
It's not too bad - until you see the reduce version.

{% highlight python %}
dna = {'C':'G', 'G':'C', 'A':'U', 'T':'A'}

# Hold on to your butts:
rna = reduce(lambda a,x: a + dna[x], "CGAT", "")

# rna => 'GCUA'
{% endhighlight %}

Now that is beautiful.
The reduce version has no free-floating bad-state `rna` variable like the loop had, and the reducer doesn't get to modify the `dna` dictionary because it's a lambda.
This means there's absolutely no touching anything with the operation.
Function, collection, and initial value come in - new value comes out.
The loop does not in any way make that guarantee.
In fact, it _needs_ to make modification to outside variables in order to actually accomplish anything.

## Statements and Expressions

Here's the _real_ difference between reduce and the loop: the first is an _expression_, the second is a collection of _statements_.
The difference is simple: an expression results in a value, a statement does not.
So what's the point of a statement?
To mutate the state of the program.
This isn't a bad thing - we need statements for stuff like printing to the screen and writing to files.
That said, what if everthing in our programs were statements?
Obviously not practical, but it's an interesting thought experiment.
Do you think the program would be easy to reason about?
Hell.
To.
The.
No.
For all intents and purposes, it would be a program consisting of nothing but global variables.
Testing it would be a monumental effort - like making it through a two hour meeting after a Chipotle lunch.

So can we do it with _just_ expressions?
This is the idea behind lisps, but it isn't pure.
Things like `def` and `print` execute side effects and return `nil`.
Technically, they're expressions, but the return values are pretty much never used so I consider them cheating.
In fact, under the covers (the deep, _deep_ covers) you get pretty much nothing but statements.
The trick is that we wrap them in functions, and use scope to control the side effects.
Functions are used as expressions just like our `count_reducer` above.
It's nothing but a series of statements wrapped and scoped into a single entity that executes without side effects.
(In Python not all functions are pure like our `count_reducer`.
Some can modify the input values, but they aren't considered pure functions.)

So here's the point: reduce allows us to take loops and turn them into expressions.
But it's not the only way.

## Map and Comprehensions

There's a third and more pythonic way to solve this problem that doesn't use reduce: a comprehension.
It has exactly the same benefits as reduce, but is perhaps a little more clear.

{% highlight python %}
dna = {'C':'G', 'G':'C', 'A':'U', 'T':'A'}

rna = ''.join([dna[x] for x in "CGAT"])

# rna => 'GCUA'
{% endhighlight %}

Comprehensions are another way to write loops as expressions.
They aren't as flexible as our new best friend, but there's a lot they can do.
A comprehension is the perfect way to solve this problem.
That's because the solution is actually not a reduction operation at all - the number of elements in the result is the same as the number of elements in the initial container.
This is called a *map* operation.
Here's yet another way to solve the problem.

{% highlight python %}
dna = {'C':'G', 'G':'C', 'A':'U', 'T':'A'}

rna = ''.join(map(lambda x: dna[x], "CGAT"))

# rna => 'GCUA'
{% endhighlight %}

## Final Thoughts
So even when we're not actually reducing anything, we can still use reduce!
That's because reduce is super-flexible.
I plan on making an entire post on this subject later, but the gist of it is that any operation you need to perform on a collection can be expressed as a reduce.
It is the alpha of collection operations, without the spray tan.

In some languages (like Scala and Clojure) reduce is very idiomatic.
In others (like Python) it's not, but that doesn't mean it can't teach us something.
Next time you want to write a hairy-ass loop with some crazy state mutation think about how you could implement it with reduce instead.
Even if you don't use it I bet the code will end up looking a lot better.