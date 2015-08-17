---
title: "Adventures in the Mesosphere"
tags: ec2 mesosphere spark politics
categories: streaming
layout: post
tweet_text: "Adventures in the #mesosphere - how the #dcos turned me into MacGyver."
---

> OR:
>   How the DCOS turned me into a cluster computing MacGyver.

This is a blow-by-blow account of the events leading to the data collection for the [Profanity Power Index]({{ site.url }}/profanitypowerindex/20150806-foxnews/) during the first GOP primary debate on Fox News.
In a nutshell, what happened was I had to learn basically last minute (in the span of about two days) how to run [Apache Spark](http://spark.apache.org) on an EC2 cluster.
If you're thinking to yourself, _That's easy, it doesn't take long at all_ then you either know what you're doing, or you haven't done it.

> You might want to give yourself a couple of days.
>
> \- My coworkers, upon hearing my plan.

Before starting, let me set the stage a bit.
I'm a data scientist in a big data consulting practice, and while I've got experience building data pipelines with the likes of Kafka/Storm, Spark, and ... yes ... even MapReduce, I don't really dip into the ops component too much.
Like, at all.

<br>
<br>
<img style="width: 50%; height: auto" src="http://i.kinja-img.com/gawker-media/image/upload/japbcvpavbzau9dbuaxf.jpg">
<br>
<br>

I wanted to collect tweets during the debate for the graphic, and because I'm overkill aficionado, I decided to use Spark Streaming on an EC2 cluster to collect the data.
More than likely I wouldn't _need_ a full-on cluster to perform this collection; a laptop can do a lot more than most people think when it comes to collecting and processing data, but then again I don't _need_ to make an interactive graphic showing how people cussed out political candidates during a debate.

This was in April.

I spent the next three months on-and-off working on the graphic.
During that time my fianc&eacute;e and I had a baby girl to add to the two year old boy in the house, so it's not like this was all I did every night/weekend.
It was more like a couple hours here or there when I got a chance and wasn't too tired to think.

Fast forward to June 16, 2015.
***Donald Trump*** just announced he's running for President as a Republican.
There is definitely no backing out of this little project.

_I have to do this._

By the time the end of July rolled around I had the graphic locked down, and had written a nice little program to collect the tweets locally with Scala, and had also implemented the Spark program to process the data (read: take tweets, return profranity).
Everything was tested and worked locally.

<br>
<br>
<img style="width:50%; height: auto" src="{{ site.url }}/images/adventures-in-the-mesosphere/local_mode_screenshot.png">
<br>
<br>

Fast forward to the week of the debate.

As a quick disclaimer, this is ___not___ a tutorial.
This is more like the _opposite_ of a tutorial, from someone who waited until the last minute and didn't follow the instructions.

**The following takes place between Tuesday, August 4th and Thursday, August 6th, 2015.**

###Tuesday, August 4th

**8:15 PM** After reading up online, I decided to use Mesosphere to launch and manage the cluster.
It seemed like a really quick and dirty way to get what I needed.
The overall architecture is simple: 

![]({{ site.url }}/images/adventures-in-the-mesosphere/PPI_Architecture.svg)

I start by following the instructions - create an AWS key, launch the CloudFormation template - wait for cluster to launch.
Except I've never done this before and I don't wait.
I try firing another cluster up and get an error that the key is in use.

Hop on over to the AWS console - 2 running.
It should be eight nodes - one m3 medium instance and seven m3 xlarge instances.
I kill the stack and try again.

Two instances.
Now I don't know what really caused this because I have no idea what I'm doing, but after 20-25 minutes I still don't have a completed stack up and running.
At this point it's about 9:30 and - for reasons you're about to discover - I head to bed.

###Wednesday, August 5th

**4:58 AM** You read that correctly.
It's a 4.
My 2 year old son is awake.
I tell my fianc&eacute;e I might need to take a little time before work to sort this out.

**5:45 AM** Starbucks.
I fire up the computer and push the buttons and look at the stack.
Eight instances.
I have no idea why it's working now but I'm not touching it.

Time to install the [dcos cli](https://docs.mesosphere.com/install/cli/).
So the way this works is you get a command to copy and paste into the terminal and oh hell....

    blah blah blah /Users/timothyrenner/.dcos/somefile: Permission Denied

Permission error on a directory that the install script created.
The install process sets up a python virtualenv in the directory of your choice to get all of the dcos CLI stuff to work like a bona-fide OS.
I executed the installation threw a couple of `sudo`s around and got it to work. 

Install finishes.
Now it's time to get Spark on this bad boy.

    dcos package install spark
    
    blah blah blah /Users/timothyrenner/.dcos/somefile: Permission Denied
    
At this point I get wise to it's shenanigans.
The installation created a directory `~/.dcos` as a side effect, and somehow it got created with root permissions, but not local ones.
It could have been when I was `sudo`-ing with impunity earlier, but I know this is one I can fix.

    chmod -R 777 ~/.dcos

Done.

    dcos package install spark
    
At this point I can see on the [Mesosphere UI](https://docs.mesosphere.com/getting-started/webinterface/) that Spark is installed, but the process for the installation didn't _quite_ match the documentation.
Here's what the [documentation](https://docs.mesosphere.com/services/spark/) says you'll see:

<br>
<br>
![this](https://docs.mesosphere.com/assets/sparktask-5dcde2ee11b9cdd514a563d1cefdf54c.png)
<br>
<br>

That showed up just fine.
It also says the following:

> From the Mesos web interface at http://\<hostname\>/mesos, verify that the Spark framework has registered and is starting tasks. 
> There should be several journalnodes, namenodes, and datanodes running as tasks. 
> Wait for all of these to show the RUNNING state.

I saw none of this.
Assuming something was wrong, I killed spark and started over.

    dcos package uninstall spark
    
    dcos package install spark
    
The command executes fine, but I don't see the Spark service on the webUI any more.
I drill down and watch [marathon](https://docs.mesosphere.com/services/marathon/) try to launch the task and fail.

Those of you who paid attention to the [dcos Spark](https://docs.mesosphere.com/services/spark/) documentation may have noticed this very subtle set of instructions taking up the entire bottom of the page.
I'll summarize it with a picture

<br>
<br>
<img style="width: 50%; height: auto" src="https://docs.mesosphere.com/assets/zkspark-dd2ff010583e608167def156305c49db.png">
<br>
<br>

> Oops.
>
> \- Rick Perry

Turns out you have to tell Zookeeper you're uninstalling stuff, otherwise you can't reinstall it.
I killed Spark in Zookeeper and ran `dcos package install spark` again, with success.
I still don't see all these "tasks" the documentation mentions, but at least I got it installed.
Maybe.
My next step _would_ be to actually launch the job, but at this point I have to pack it in and head to work.

**8:30 PM** Kids are in bed.
I spin up the cluster again, but before I install the CLI, I execute this command:

    sudo pip uninstall virtualenv
    pip install virtualenv
    
While I'm not 100% certain on this - I think my permission woes had to do with the fact that virtualenv was installed under su, a really awful habit I got into before I figured out how pip and virtualenv really work together.
I'm not going to say exactly when that was, but ... very recently.

So after performing those steps _everything falls exactly into place_.
Works, as advertised.
EC2, the CLI, Spark ... flawless.

This is when shit really hit the fan.
<br>
<br>
<img style="width: 50%; height: auto" src="http://i.imgur.com/CHmBhqM.gif">
<br>
<br>

The next step in the process is to get the fat jar into a publicly accessible URL so I can launch the spark job from my command line:

    dcos spark run --submit-args="--class profanitypowerindex.spark.ProfanityPowerIndexCollector s3://bucket/to/fat.jar collect_config.json"

Everything in quotes gets passed right to `spark-submit`, so it's pretty simple.
That `config.json` contains the path to the output files, among other configuration options.
The file output path looks something like this:

    "filePrefix": "s3n://bucket/to/ppi/ppi-"

The prefix itself is passed to the `saveAsTextFile` method of the `DStream` object, which appends the prefix with the time for each batch that gets processed, and dumps it into some partitioned text files.
I see the job pop up in the Mesosphere UI, I see my CPU go through the roof.
Everything looks like it's working.
I pop on over to s3 and ... nothing.
Nobody's getting written to the bucket.

I kill the job (also very simple)
    
    dcos spark kill 12345
    
or whatever the job ID was.
I realize I never put any authentication into the S3 configuration.
No big deal - just Google around a bit.
I get a hit on [StackOverflow](http://stackoverflow.com/questions/24048729/how-to-read-input-from-s3-in-a-spark-streaming-ec2-cluster-application)
It isn't exactly what I want because it's trying for read access, but I figure I can give it a shot and see what happens.
I generate the keys at the AWS console, and put it into `src/main/resources` so I can read it from the driver on the Mesosphere cluster.
I follow the StackOverflow answer almost to the letter load the credentials into the Spark context like so:

{% highlight scala %}
val hadoopConf = ssc.sparkContext.hadoopConfiguration

hadoopConf.set("fs.s3n.impl", "org.apache.hadoop.fs.s3native.NativeS3FileSystem")
hadoopConf.set("fs.s3n.awsAccessKeyId", accessKey)
hadoopConf.set("fs.s3n.awsSecretAccessKey", secretKey)

{% endhighlight %}

Bundle it, load it back into S3, make it public, and submit the job again.

**If you just shit your pants, be aware that I _know_.**

**If you didn't shit your pants, read on to find out why you should have.**

Still nothing.
The job spins up just fine, but it won't write.
Moreover, I'm seeing task failed errors in the UI.
Okay, kill the job again.
I'm all out of ideas on why it's not working so I decide to try a local run instead.
I suspect it's S3 because it's not a lot of data and I already successfully tested a local filesystem write.
The local run tells the _real_ story.

    ... java.lang.NoSuchMethodError: org.jets3t.service.impl.rest.httpclient.RestS3Service.<init>(Lorg/jets3t/service/security/AWSCredentials;)V

Oh great, dependency hell.
Or as I sometimes call it, working with Java.
I email a couple of coworkers to see if they've hit this before (they have), and we trace it to [this issue](https://github.com/apache/spark/pull/468#issuecomment-41639298) on Github.
I'll spare you the gore, but the discussion around this took place over an _entire year_.
Allegedly it was resolved, and the Spark `pom.xml` has a newer version of the library in question (jets3t 0.9), but that's not what I was seeing in the dependency tree (jets3t 0.7.3).
Near as I can tell it somehow got clobbered in the Spark pre-built binary I'm using to run it, but really I have no damned clue.

At this point I have a choice: throw in the towel, or try to sort out whether it's the Spark I'm using in my `build.sbt`, the Spark I'm using locally, or the Spark that's running on the Mesosphere DCOS.
The debate is tomorrow.
I have a local collector.
It works.

I throw in the towel and go to bed.

###Thursday, August 6th

**4:45 AM**

Kid's awake.
I get up, in a pissed off mood because it's 4:45 in the morning and at some point in that first 30 minutes of wakefulness while chasing down a mystically empowered toddler, explaining why it's too dark to play outside for the 300th time and a diaper change it occurs to me that _my AWS keys are sitting in a **publicly accessible jar file** on S3_.

<br>
<br>
<img style="width: 50%; height: auto" src="https://uproxx.files.wordpress.com/2010/11/bruce-willis-lastboyscout-ridiclious.jpg">
<br>
<br>

Obviously I fixed this.
For the record, you can revoke the key access at the AWS console in exactly the same way you created it, and it does not pass judgement on your questionable security choices.

Thank the nine I didn't commit it to the git repo.

_By the way, my Twitter creds were there too._
_I reset those as well._

**2:35 PM**

Conversation with my coworker (who we'll call Chet, to protect the innocent).

> **Chet**: Hey man, did you get the Spark dependency thing figured out?
>
> **Me**: Nope, never figured it out.
>
> **Chet**: Damn, sorry man.
> 
> **Me**: Not a big deal, I've still got the local build working. But I've got one more thing to try though.
>
> **Me**: I think I'm going to hail mary it and use HDFS.
>
> **Chet**: You can run HDFS with Mesosphere?
>
> **Me**: Yup.
>
> **Chet**: ...
>
> **Chet**: You are very brave.

The reason he said this, for the two of you who are still reading, is because _this shit never works the first time_.
If you don't believe me, go to the top of the page and read it again.
Between the commute home, dinner, kids _and_ family who was in town there was no time for error, so it's either going to be perfect or I'm screwed.

**5:30 PM**

T minus 120 minutes until I want to start collecting data.
Pretty much everything that happens next is done in five-ish minute spurts between chasing my kid around the house.

I fire up the cluster and install the DCOS CLI client again.
I start by installing Spark, as usual, then I install HDFS.
It's very simple.

    dcos package install hdfs
    
... done.

Next, I need to SSH into my cluster.
The [instructions](https://docs.mesosphere.com/services/sshcluster/) for doing this are really clear, and they pretty much worked as advertised except that moving the `.pem` file into `~/.ssh/` didn't really make the identity accessible to the system.
That was an easy fix though.

    ssh -i ~/.ssh/dcos_test.pem core@12.34.567.8

And I'm in.
I run a quick test to see that HDFS is installed as advertised.

    hadoop fs -touchz hdfs://hdfs/test.txt
        
    hadoop fs -ls hdfs://hdfs/
    
    # test.txt
    
All good.
Now time to make a landing pad for my data:

    hadoop fs -mkdir hdfs://hdfs/ppi/
    
Finally, I need to set the file prefix in my `config.json` file:

    "filePrefix": "hdfs://hdfs/ppi/ppi-"
    
Fat jar it up, put it on S3 (_without_ my AWS keys, but with my Twitter keys which I plan to reset _again_ when it's done because I do not have time to fix it and do it right), and make it public.
I launch the Spark job one more time, watch the CPU go through the roof again, and check out the running services.

<br>
<br>
<img style="width: 100%; height: auto" src="{{ site.url }}/images/adventures-in-the-mesosphere/all_systems_go.jpg">
<br>
<br>

...and now I'll pause to mention the **insane** amount of resources allocated to HDFS.
I have no idea what's up with that, but it ain't natural.
Again, no time to really investigate.
One more thing I'll mention is that this is absolutely _not_ the most efficient way to handle this type of data.
Even dumping to S3 is probably not a great idea.
The "right" way to do it, for people who "know what they're doing", would be to write it to database like Cassandra or HBase.
Writing tons of small files is not really what HDFS is designed for.

Anyway, it's time to check the results.

    hadoop fs -ls hdfs://hdfs/ppi/
    
And I get a list of directories!
It's ALIVE!

<br>
<br>
<img style="width: 50%; height auto" src="http://i.imgur.com/jP66Avv.gif">
<br>
<br>

One more check just to be sure.
Cat all of the files together and look at the beautiful, beautiful results.

    hadoop fs -cat hdfs://hdfs/ppi/ppi-*/*
    
Nothing.
Not. A. Damned. Thing.
I'm getting failed tasks every second, and directories are getting created, but no data!
One hour until the collect and I'm completely hosed.

Then, it hits me.

    hadoop fs -chmod -R 777 hdfs://hdfs/ppi/
    
    hadoop fs -cat hdfs://hdfs/ppi/ppi-*/*
    
The screen fills with profanity, mostly about [Donald Trump]({{ site.url }}/profanitypowerindex/20150806-foxnews/).
Boom.
Done.

The job ran flawlessly until it crashed about ten minutes after the debate was done.
I have no clue what happened, but I got the data.

<br>
<br>
![IN](http://cdn.lifebuzz.com/images/66351/lifebuzz-5d939b98938dd817b93889777fbeca0c-original.gif)
<br>
<br>

If there's one takeaway from this otherwise shameless waste of your time, it's this:
The Mesosphere DCOS delivers.
It's goal is to make running a cluster as easy as running a computer and it worked.
With less than ninety minutes left I made a somewhat significant architecture change and successfully (ish) executed to project.
Next time I want to use a cluster for something ([Democrats, anyone?](https://en.wikipedia.org/wiki/Democratic_Party_presidential_debates,_2016#October_13.2C_2015_.E2.80.93_Las_Vegas.2C_Nevada)) this is definitely how I'm going to do it.
I might give myself a _little_ more lead time though.