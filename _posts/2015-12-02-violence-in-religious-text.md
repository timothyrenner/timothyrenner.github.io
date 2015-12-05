---
title: "A Quantitative Look at Violence in Religious Texts"
tags: notebook clojure
categories: datascience
layout: post
tweet_text: "A Quantitative Look at Violence in Religious Texts with #clojure and #gorillarepl."
---

There's been a lot of dicussion about religion and violence in light of recent events, with some claiming that certain religions are inherently more violent than others.
I thought it would be interesting to examine this assertion by looking at holy texts from six major religions (Buddhism, Christianity, Hinduism, Islam, Judaism, and the Church of Jesus Christ of Latter-day Saints) and "measuring" the violence in each.

Now obviously there's no way this analysis is a complete treatment of the subject.
This subject is incredibly nuanced; an (admittedly incomplete) examination of the texts is one very small facet of the overall discussion.
Regardless, I think it's well worth a look, and the results may surprise you.
At the very least it's quite an exercise in data cleaning - if you're into that sort of thing.

I'll do this analysis with [Gorilla REPL](http://gorilla-repl.org/) and Clojure.
If you want to follow along with the code, click the code panels.
If you want to run it yourself, clone the [git repo](https://github.com/timothyrenner/violence-in-religious-text).


{% include code-panel-open.html panel_id="one" %}
{% highlight clojure %}

(ns violence-in-religious-text-nb
  (:require [gorilla-plot.core :as plot]
            [gorilla-repl.image :as img]
            [gorilla-repl.table :as tbl]
            [gg4clj.core :as gg4clj]
            [opennlp.nlp :as nlp]
            [clojure.string :as str]
            [clojure.set :as st]
            [clojure.java.io :as io]
            [clucy.core :as clucy])
  (:import [wordcloud WordCloud WordFrequency CollisionMode]
           [wordcloud.bg RectangleBackground]
           [javax.imageio ImageIO]))

{% endhighlight %}
{% include code-panel-close.html %}

The general strategy is simple; count the number of sentences containing violence-related words in each religious book.
The first thing we'll need (besides the data) is a way of obtaining the sentences from the text.
It seems easier than it is; the variety of punctuation patterns, quotations, etc make this pretty nontrivial.
Fortunately it's something there's been a lot of work already done, and we're going to use it.
The [OpenNLP](https://opennlp.apache.org/) (NLP = natural language processing) library has a model for sentence chunking.

{% include code-panel-open.html panel_id="two" %}
{% highlight clojure %}

;; Sentence chunking model can be obtained at:
;; http://opennlp.sourceforge.net/models-1.5/

(def get-sentences (nlp/make-sentence-detector "resources/en-sent.bin"))

{% endhighlight %}
{% include code-panel-close.html %}

The books were pulled from Project Gutenberg (except the Jewish scriptures).
They can be obtained at the following links:

* Buddhism, [Dhammapada](https://www.gutenberg.org/ebooks/2017)
* Christianity, [The Holy Bible (World English Bible)](https://www.gutenberg.org/ebooks/8294)
* Hinduism, [The Vedas](https://www.gutenberg.org/ebooks/16295)
* Islam, [The Koran](https://www.gutenberg.org/ebooks/3434)
* Judaism, [The Jewish Scriptures](https://archive.org/details/holyscripturesac028077mbp)
* Latter Day Saints, [The Book of Mormon](https://www.gutenberg.org/ebooks/17)

The choice of Hindu and Buddhist texts is somewhat arbitrary; there isn't any single centralized holy text for those religions, so I picked two of the more well-known (to me at least) texts.
The Jewish Scriptures I pulled is perhaps not the best translation to apply this type of analysis on.
Unfortunately Project Gutenberg's collection is just links to the Bible on an individual book-by-book basis.
This would be an immense amount of work to assemble and clean, so I opted for a collected edition.

Each book is presented as plain text, but a substantial (and I mean _substantial_) amount of cleaning is required.
I will spare you the details, but suffice it to say there's a solid amount of code required. 
Hit the code bar at your own risk.

{% include code-panel-open.html panel_id="three" %}
{% highlight clojure %}

;; Each of these texts requires a substantial amount of cleaning.
;; Rather than scrub this offline, I'll do it here so it can be reproduced easily just by downloading the files.
;; The scrubbing is not trivial.

;; In addition to formatting differences, each text has front and tail matter that should be removed.
;; The lines of the files to keep are as follows:
;; Dhammapada: 87 - 1717
;; The Holy Bible: 45 - 79122
;; The Vedas: 4363 - 19604
;; The Koran: 1034 - 26633
;; Jewish Scriptures: 1509 - 147516
;; Book of Mormon: 133 - 39914

(def dhammapada 
  ;; Read the file, split on lines.
  (->> (str/split (slurp "resources/the-dhammapada.txt") #"\r\n")
       ;; Take the first 1717 lines (lines prior to tail matter).
       (take 1717)
       ;; Drop the introduction.
       (drop 87)
       ;; Kill leading / trailing whitespace.
       (map str/trim)
       ;; Stitch together into a single string.
       (str/join " ")
       ;; Run the sentence chunker.
       get-sentences
       ;; Drop leading and trailing numbers.
       (map #(str/replace % #"(^\d+\.|\d+\.$)" ""))
       ;; Remove empty strings.
       (remove str/blank?)))

(def bible
  ;; Read the file, split on lines.
  (->> (str/split (slurp "resources/christian-bible.txt") #"\r\n")
       ;; Take the first 79122 lines (lines prior to tail matter).
       (take 79122)
       ;; Drop the introduction.
       (drop 45)
       ;; Kill leading / trailing whitespace.
       (map str/trim)
       ;; Replace chapter:verse markers.
       (map #(str/replace % #"^\d+:\d+" ""))
       ;; Stitch together into a single string.
       (str/join " ")
       ;; Run the sentence chunker.
       get-sentences
       ;; Remove empty strings.
       (remove str/blank?)))

(def vedas
  ;; Read the file, split on lines.
  (->> (str/split (slurp "resources/hindu-vedas.txt") #"\r\n")
       ;; Take the first 19604 lines (lines prior to tail matter).
       (take 19604)
       ;; Drop the introduction.
       (drop 4518)
       ;; Kill any leading/trailing whitespace.
       (map str/trim)
       ;; Mash back together to preserve paragraphs.
       (str/join "\r\n")
       ;; Split on double carriage returns (paragraphs).
       ((fn [s] (str/split s #"\r\n\r\n")))
       ;; Keep only the paragraphs that start with a digit.
       ;; Other paragraphs are commentary.
       (filter #(re-find #"^\d+\." %))
       ;; Drop the digit.
       (map #(str/replace % #"^\d+\.\s*" ""))
       ;; Drop intermediate carriage returns.
       (map #(str/replace % #"(\r|\n)" " "))
       ;; Mash into one string.
       (str/join " ")
       ;; Run the sentence chunker.
       get-sentences
       ;; Drop blank sentences.
       (remove str/blank?)))

(def koran
  ;; Read the file, split on lines.
  (->> (str/split (slurp "resources/the-koran.txt") #"\r\n")
       ;; Take the first 26633 lines (lines prior to tail matter).
       (take 26633)
       ;; Drop the introduction.
       (drop 1034)
       ;; Kill any leading / trailing whitespace.
       (map str/trim)
       ;; Mash the lines back together to restore paragraphs.
       (str/join "\r\n")
       ;; Split on the paragraphs.
       ((fn [s] (str/split s #"\r\n\r\n")))
       ;; Drop footnotes.
       (remove #(re-find #"^\d+" %))
       ;; Drop underscore lines.
       (remove #(re-find #"^\s*_*$" %))
       ;; Remove footnote digits (makes sentence chunker work better).
       (map #(str/replace % #"\d" ""))
       ;; Remove intermediate carriage returns.
       (map #(str/replace % #"(\r|\n)" " "))
       ;; Mash into one big string.
       (str/join " ")
       ;; Run the sentence chunker.
       get-sentences))

(def jewish-scriptures
  ;; Read the file, split on lines.
  (->> (str/split (slurp "resources/jewish-scriptures.txt") #"\n")
       ;; Take the first 147516 lines (lines prior to the tail matter).
       (take 147516)
       ;; Drop the HTML front matter.
       (drop 1508)
       ;; Mash the lines back together.
       (str/join "\n")
       ;; Split on the page breaks.
       ((fn [s] (str/split s #"\n\n\n\n")))
       ;; Remove lines containing only numbers.
       (remove #(re-find #"^\s*\d+\.?\d*\s*$" %))
       ;; Remove lines containing only capital letters,
       ;; like the book name at the bottom of each page.
       (remove #(re-find #"^\s*[A-Z]+\s*$" %))
       ;; Remove verse numbers.
       (map #(str/replace % #"\d" ""))
       ;; Remove embedded new line characters.
       (map #(str/replace % #"\n" " "))
       ;; Mash into one big string.
       (str/join " ")
       ;; Run the sentence chunker.
       get-sentences))

(def book-of-mormon
  ;; Read the file, split on lines.
  (->> (str/split (slurp "resources/the-book-of-mormon.txt") #"\r\n")
       ;; Take the first 39914 lines (lines prior to the tail matter).
       (take 39914)
       ;; Drop the front matter.
       (drop 133)
       ;; Remove book labels.
       (remove #(re-find #"^\d\s+\w+\s+\d+\s*$" %))
       ;; Remove chapter markers.
       (remove #(re-find #"^\w+\s+\d+\s*$" %))
       ;; Remove verse headers.
       (remove #(re-find #"^\d\s+\w+\s+\d+:\d+\s*$" %))
       ;; Remove blanks.
       (remove str/blank?)
       ;; Mash into one big string.
       (str/join " ")
       ;; Remove inline verse markers.
       ((fn [s] (str/replace s #"\d" "")))
       ;; Run the sentence chunker.
       get-sentences))

{% endhighlight %}
{% include code-panel-close.html %}

How many sentences in each book?

{% include code-panel-open.html panel_id="four" %}
{% highlight clojure %}

(def book-counts {"The Dhammapada" (count dhammapada)
                  "The Holy Bible" (count bible)
                  "The Vedas" (count vedas)
                  "The Koran" (count koran)
                  "The Jewish Scriptures" (count jewish-scriptures)
                  "The Book of Mormon" (count book-of-mormon)})

(tbl/table-view (map (fn [[k v]] [k (format "%,d" v)]) book-counts))

{% endhighlight %}
{% include code-panel-close.html %}

<center><table class="table"><tr><td>The Dhammapada</td><td>548</td></tr>
<tr><td>The Holy Bible</td><td>36,316</td></tr>
<tr><td>The Vedas</td><td>243</td></tr>
<tr><td>The Koran</td><td>7,616</td></tr>
<tr><td>The Jewish Scriptures</td><td>20,498</td></tr>
<tr><td>The Book of Mormon</td><td>7,605</td></tr></table></center>

Note that the Jewish Scriptures and the Bible both have _by far_ the highest number of sentences.
This will come into play when we start counting the violent sentences later.

Next, we need a list of words related to violence.
This is where the arbitrary nature of the analysis rears its ugly head.
Here's 24 words I picked kind-of randomly with a little googling.

**wound, hurt, fight, violate, destroy, slaughter, murder, kill, attack, break, crush, provoke, anger, hatred, bloodshed, rage, fear, suffer, violent, war, stab, shoot strike, rape**.

[Clone](https://github.com/timothyrenner/violence-in-religious-text) and run the notebook if you want to pick your own list of violent words (or any words, actually).

{% include code-panel-open.html panel_id="five" %}
{% highlight clojure %}

(def violent-words
  ["wound"     "hurt"    "fight"  "violate" "destroy" 
   "slaughter" "murder"  "kill"   "attack"  "break" 
   "crush"     "provoke" "anger"  "hatred"  "bloodshed" 
   "rage"      "fear"    "suffer" "violent" 
   "war"       "stab"    "shoot"  "strike"  "rape"])

{% endhighlight %}
{% include code-panel-close.html %}

Finally, we need a way to detect when a word is _in_ a sentence.
This is even harder than detecting sentences; we have to detect _words_ within a sentence.

Suppose we want to search a book for instances of the word _kill_.
We can search for the exact word and we'll do okay, but we'd miss any that were at the end of a sentence (_kill?_, _kill!_, _kill._) or really any instance followed by punctuation (_kill,_, _kill;_).
We'd also miss words we may want to count: _killing_, _killed_, etc.

Luckily, this is not an uncommon need; it's called the _search problem_.
There are a number of ways to tackle this, but since I'm feeling especially lazy I opted for [Apache Lucene](http://lucene.apache.org/).
Lucene is essentially a document store that let's you pull documents based on textual queries.
It does this by analyzing the documents as they're added and indexes them based on their contents using natural language processing techniques with (probably) a sprinkle of magic.
We can use it to index each sentence of each book, then perform a search on the words we want.
At that point all we'd need to do is count the results of our search and we have our answer.

{% include code-panel-open.html panel_id="six" %}
{% highlight clojure %}

(def index (clucy/memory-index))

(apply clucy/add index (map (fn [s] {:book "The Dhammapada" :sentence s}) 
                            dhammapada))

(apply clucy/add index (map (fn [s] {:book "The Holy Bible" :sentence s}) 
                            bible))

(apply clucy/add index (map (fn [s] {:book "The Vedas" :sentence s}) 
                            vedas))

(apply clucy/add index (map (fn [s] {:book "The Koran" :sentence s}) 
                            koran))

(apply clucy/add index (map (fn [s] {:book "The Jewish Scriptures" :sentence s}) 
                            jewish-scriptures))

(apply clucy/add index (map (fn [s] {:book "The Book of Mormon" :sentence s}) 
                            book-of-mormon))

{% endhighlight %}
{% include code-panel-close.html %}

Just to demonstrate Lucene's capabilities, I'll perform a query for the word "rape" and look at the sentences it retrieves.

{% include code-panel-open.html panel_id="seven" %}
{% highlight clojure %}

(doseq [s (clucy/search index "rape*~0.8" 10)] 
  (println (str (:book s) ": " (:sentence s) "\n")))

{% endhighlight %}
{% include code-panel-close.html %}


```
The Holy Bible: Their houses will be ransacked, and their wives raped.

The Jewish Scriptures: In those days saw I in Judah some  treading winepresses on the sabbath,  and bringing in heaps of corn, and  lading asses therewith; as also wine,  ;rapes, and figs, and all manner of  urdens, which they brought into  Jerusalem on the sabbath day; and I  forewarned them in the day where-  in they sold victuals.
```

Notice that the query returned "raped" and ";rapes"; Lucene doesn't necessarily need an exact match.
It's clear from the context that the match in the Jewish Scriptures is incorrect.
Not only is it not referring to the correct word in the first place (should be "grapes"), but the word isn't even spelled properly. 
This is important, as it reveals the limitations of the analysis technique.

* Unstructured text is almost never "all the way clean".
* Obtaining context is extremely difficult.

There has been an enormous amount of progress in the NLP community on teasing out context, particularly with neural network based techniques.
We'll be using exactly none of that research and stick with the simple stuff.

Without further delay, let's take a look at what Lucene can get us.

{% include code-panel-open.html panel_id="eight"%}
{% highlight clojure %}

(def total-sentences (apply + (vals book-counts)))

(def violent-sentences
  ;; Perform and flatten the search for each violent word.
  (mapcat (fn [w]
            ;; Inject the query into the result.
            (map (fn [s] (into {:word w} s))
                 ;; *~0.8 -> wildcard at the end + edit distance fuzziness
                 (clucy/search index (str w "*~0.8") total-sentences))) 
           violent-words))

(def violent-sentence-counts
  ;; Group by the books. Strip out the query word so we don't double count.
  (->> (group-by :book (map #(select-keys % [:book :sentence]) violent-sentences))
       ;; Put in empty vector defaults in case there are no violent sentences.
       (into (apply hash-map (interleave (keys book-counts) (repeat []))))
       ;; Count the distinct number of sentences in each.
       (map (fn [[b s]] 
              (let [c (count (distinct s))
                    r (/ (float c) (book-counts b))]
                {:book [b] 
                 :count [c]
                 :clabel [(format "%,d" c)]
                 :ratio [r] 
                 :rlabel [(format "%.3f" r)]})))
       ;; Flatten into a columnar form for the R data frame.
       (reduce (fn [a x] (merge-with concat a x)) {})))

{% endhighlight %}
{% include code-panel-close.html %}

The first thing we should look at is the raw counts of sentences containing violence.

{% include code-panel-open.html panel_id="nine" %}
{% highlight clojure %}

;; Define the data structure for the plot.
(def violent-count-plot 
  [[:<- :g (gg4clj/data-frame violent-sentence-counts)]
              (gg4clj/r+
                [:ggplot :g [:aes {:x :book :y :count :label :clabel}]]
                ;; Style the main bar.
                [:geom_bar {:stat "identity" :color "steelblue" :fill "steelblue"}]
                ;; Add the values.
                [:geom_text {:hjust -0.1}]
                ;; Extend the y axis to accomodate labels.
                [:ylim 0 3000]
                ;; Add title.
                [:ggtitle "Sentences with Violent Words"]
                ;; Remove the axis labels.
                [:xlab ""]
                [:ylab ""]
                ;; Flip to horizontal bar.
                [:coord_flip])])

;; Save to a file for convenience.
(spit "images/violent-count-plot.svg" (gg4clj/render violent-count-plot))

;; Render it in the REPL.
(gg4clj/view violent-count-plot)

{% endhighlight %}
{% include code-panel-close.html %}

![]({{ site.url }}/images/violence-in-religious-text/violent-count-plot.svg)

By a landslide, the Bible is on top, followed closely by the Jewish Scriptures.
This isn't unexpected for two reasons:

1. The Bible and Jewish Scriptures have the most sentences.
2. The Jewish Scriptures share a huge amount of material with the Bible.

The Vedas has no violent sentences at all.

A better way to look at the data is to compute the ratio of violent sentences against total sentences.

{% include code-panel-open.html panel_id="ten" %}
{% highlight clojure %}

;; Define the data structure for the plot.
(def violent-normalized-plot
  [[:<- :g (gg4clj/data-frame violent-sentence-counts)]
              (gg4clj/r+
                [:ggplot :g [:aes {:x :book :y :ratio :label :rlabel}]]
                ;; Style the main bar.
                [:geom_bar {:stat "identity" :color "steelblue" :fill "steelblue"}]
                ;; Add the values.
                [:geom_text {:hjust -0.1}]
                ;; Extend the y axis to accomodate labels.
                [:ylim 0 0.2]
                ;; Add title.
                [:ggtitle "Sentences with Violent Words (Normalized)"]
                ;; Remove the axis labels.
                [:xlab ""]
                [:ylab ""]
                ;; Flip to horizontal bar.
                [:coord_flip])])

;; Save it to a file.
(spit "images/violent-normalized-plot.svg" (gg4clj/render violent-normalized-plot))

;; ... and render it in the REPL.
(gg4clj/view violent-normalized-plot)

{% endhighlight %}
{% include code-panel-close.html %}

![]({{ site.url }}/images/violence-in-religious-text/violent-normalized-plot.svg)

Now things are more interesting.
Far ahead of the others we have Dhammapada and the Book of Mormon.
To tease out a little more context and chase down this surprising (at least to me) result we need to look at which of the violent words in the list were in the most sentences.
We could visualize this with just a series of barcharts, but since we're specifically producing counts of words I think word clouds will be a lot more fun.

{% include code-panel-open.html panel_id="eleven"%}
{% highlight clojure %}

(def violent-word-counts
  (->> (map #(select-keys % [:book :word]) violent-sentences)
       frequencies
       (map (fn [[bw c]] (into bw {:count c})))))

(defn word-cloud [book]
  (let [fname (str "images/" 
                   (->> book
                        ;; Lower case the title.
                        str/lower-case 
                        ;; Replace spaces with dashes.
                        ((fn [s] (str/replace s #"\s" "-"))))
                   ".png")]
    ;; This builds the word cloud and drops it into a file.
  	(doto (WordCloud. 450 225 CollisionMode/PIXEL_PERFECT)
    	(.build
      	(java.util.ArrayList.
          	;; Select the relevant book
        	(->> (filter #(= (:book %) book) violent-word-counts)
                 ;; Get only the words and counts.
            	 (map #(select-keys % [:word :count]))
                 ;; Place each in a WordFrequency object.
             	(map #(WordFrequency. (:word %) (:count %))))))
        ;; Save to a file.
    	(.writeToFile fname))
    
    ;; Read the file and render.
  	(img/image-view (ImageIO/read (io/file fname)))))

{% endhighlight %}
{% include code-panel-close.html %}

### The Holy Bible

{% include code-panel-open.html panel_id="twelve" %}
{% highlight clojure %}

(word-cloud "The Holy Bible")

{% endhighlight %}
{% include code-panel-close.html %}

![]({{ site.url }}/images/violence-in-religious-text/the-holy-bible.png)

### The Jewish Scriptures

{% include code-panel-open.html panel_id="thirteen" %}
{% highlight clojure %}

(word-cloud "The Jewish Scriptures")

{% endhighlight %}
{% include code-panel-close.html %}

![]({{ site.url }}/images/violence-in-religious-text/the-jewish-scriptures.png)

### The Koran

{% include code-panel-open.html panel_id="fourteen" %}
{% highlight clojure %}

(word-cloud "The Koran")

{% endhighlight %}
{% include code-panel-close.html %}

![]({{ site.url }}/images/violence-in-religious-text/the-koran.png)

### The Book of Mormon

{% include code-panel-open.html panel_id="fifteen" %}
{% highlight clojure %}

(word-cloud "The Book of Mormon")

{% endhighlight %}
{% include code-panel-close.html %}

![]({{ site.url }}/images/violence-in-religious-text/the-book-of-mormon.png)

### The Dhammapada

{% include code-panel-open.html panel_id="sixteen" %}
{% highlight clojure %}

(word-cloud "The Dhammapada")

{% endhighlight %}
{% include code-panel-close.html %}

![]({{ site.url }}/images/violence-in-religious-text/the-dhammapada.png)

Now things are really interesting!
Fear is a common theme amongst all of the texts (except Vedas, which would have been a really boring word cloud).

The Jewish Scriptures, the Bible, and the Book of Mormon all have a large number of sentences containing "destroy", something much less prominent in the Koran.
The Bible also has a large number of sentences with "kill", though this is likely a consequence of the translation as much as anything else.
The other texts use much more formal language.

Another standout is the prominence of "suffer" in both the Dhammapada and the Book of Mormon - our two "most violent" texts.
We can get an even better sense of context by just sampling the sentences that match our queries.

{% include code-panel-open.html panel_id="seventeen" %}
{% highlight clojure %}

(doseq [s (->>  violent-sentences 
                ;; Get only Dhammapada.
     		    (filter #(= (:book %) "The Dhammapada"))
                ;; Rearrange.
     		    shuffle
                ;; Grab the first ten.
     		    (take 10)
                ;; Extract the sentence.
     		    (map :sentence))]
  (println s)
  (println))

{% endhighlight %}
{% include code-panel-close.html %}

```
A true Brahmana goes scatheless, though he have killed father and mother, and two valiant kings, though he has destroyed a kingdom with all its subjects.

Not to blame, not to strike, to live restrained under the law, to be moderate in eating, to sleep and sit alone, and to dwell on the highest thoughts,--this is the teaching of the Awakened.

If a man's thoughts are not dissipated, if his mind is not perplexed, if he has ceased to think of good or evil, then there is no fear for him while he is watchful.

The evil done by oneself, self-begotten, self-bred, crushes the foolish, as a diamond breaks a precious stone.

Let us live happily then, not hating those who hate us! among men who hate us let us dwell free from hatred!  

 "He abused me, he beat me, he defeated me, he robbed me,"--in those who harbour such thoughts hatred will never cease.

Or lightning-fire will burn his houses; and when his body is destroyed, the fool will go to hell.

A true Brahmana goes scatheless, though he have killed father and mother, and two holy kings, and an eminent man besides.

All men tremble at punishment, all men fear death; remember that you are like unto them, and do not kill, nor cause slaughter.

Pleasures destroy the foolish, if they look not for the other shore; the foolish by his thirst for pleasures destroys himself, as if he were his own enemy.


```

It's pretty clear from this sample that we're looking at advice _against_ violence here.
This makes sense, the Dhammapada is a collection of sayings, not an actual story.
Suffering is also a key theme in Buddhism, so it's no surprise we see it heavily represented.

Let's look at the Book of Mormon.

{% include code-panel-open.html panel_id="eighteen" %}
{% highlight clojure %}

(doseq [s (->>  violent-sentences 
                ;; Get only Book of Mormon.
     		    (filter #(= (:book %) "The Book of Mormon"))
                ;; Rearrange.
     		    shuffle
                ;; Grab the first ten.
     		    (take 10)
                ;; Extract the sentence.
     		    (map :sentence))]
  (println s)
  (println))

{% endhighlight %}
{% include code-panel-close.html %}

```
Moroni :   For behold, their wars are exceedingly fierce among themselves; and because of their hatred they put to death every Nephite that will not deny the Christ.

Alma :   But the law requireth the life of him who hath murdered; therefore there can be nothing which is short of an infinite atonement which will suffice for the sins of the world.

Mormon :   And it came to pass that I did speak unto my people, and did urge them with great energy, that they would stand boldly before the Lamanites and fight for their wives, and their children, and their houses, and their homes.

Mosiah :   Yea, they went again even the third time, and suffered in the like manner; and those that were not slain returned again to the city of Nephi.

And behold it shall come to pass that after the Messiah hath risen from the dead, and hath manifested himself unto his people, unto as many as will believe on his name, behold, Jerusalem shall be destroyed again; for wo unto them that fight against God and the people of his church.

Alma :   Then, my brethren, ye shall reap the rewards of your faith, and your diligence, and patience, and long-suffering, waiting for the tree to bring forth fruit unto you.

Ether :   For so great had been the spreading of this wicked and secret society that it had corrupted the hearts of all the people; therefore Jared was murdered upon his throne, and Akish reigned in his stead.

Alma :   Therefore, whosoever suffered himself to be led away by the Lamanites was called under that head, and there was a mark set upon him.

Helaman :   And it came to pass that Helaman did send forth to take this band of robbers and secret murderers, that they might be executed according to the law.

Jacob :   And it came to pass that many means were devised to reclaim and restore the Lamanites to the knowledge of the truth; but it all was vain, for they delighted in wars and bloodshed, and they had an eternal hatred against us, their brethren.


```

The Book or Mormon, on the other hand,contains a mixture of sayings and warnings against violence with actual violence in the form of a story.
This is very much in line with the style seen in the Jewish Scriptures and the Bible, which are presented as a mixture of narrative, dialogue, and proverb.

Going into this, I thought the Bible and Jewish Scriptures were going to have the most violence by a longshot.
In some sense they did, but only because they're the longest.
When accounting for the relative lengths of the texts, Dhammapada and Book of Mormon came out way _way_ ahead of the others.

What really surprised me was the number of violent sentences in the Book of Mormon.
Members of the LDS church have a well-deserved reputation for being nice.
Actually, the kindest people I know belong to the LDS church.
 
In the end, I think this analysis told us exactly what we expected about violence and religion: pretty much nothing :).
At least we got some morbid word clouds out of it.
