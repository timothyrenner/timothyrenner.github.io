---
title: "Election Turnout"
output:
  html_document: default
  html_notebook: default
  pdf_document: default
---

A little factoid gets thrown around a lot around election time that the Democrats tend to win when the voter turnout is high.
Obviously this isn't really talked about much by Republicans.
It's commonly believed among Democrat circles that this is the reason why Republicans campaign for more restrictive voter registration laws.
Republicans obviously don't agree, stating the laws are to prevent voter fraud.
So who's right?
Well it's pretty tough to get ahold of voter fraud data (studies are at best [inconclusive](https://ballotpedia.org/Voter_fraud)), but getting election result data isn't.
I've built a dataset with the FEC election results from the years 2000 - 2014 that's designed to work really well with R's [tidyverse](http://tidyverse.org/).
If you're following along with the code, the dataset's located in `fec-election-results/fec_tidy.csv`.

{% include code-panel-open.html panel_id="one" %}
{% highlight r %}
library(tidyverse)
library(stringr)

fec <- read_csv('fec-election-results/fec_tidy.csv')
{% endhighlight %}
{% include code-panel-close.html %}

There's a lot of information here, but we're primarily concerned with the election year, the chamber (President, House or Senate), the party and obviously the percentage of votes.
To get a full description of the dataset check out its [GitHub page](https://github.com/timothyrenner/fec-election-results).
The election results are only half the equation.
The other half is voter turnout.
Thankfully, the [US Census Bureau](http://www.census.gov/data/tables/time-series/demo/voting-and-registration/voting-historical-time-series.html) has our back.
Sort of.
It's in Excel.
Thankfully, yours truly has cleaned and tidied that data as well - check out the [Github page](https://github.com/timothyrenner/census_voter_data) for more information on this dataset.
If you're running the notebook, that data's in `census_voter_data/census_voter_data.csv`.

{% include code-panel-open.html panel_id="two" %}
{% highlight r %}
census.turnout <- read_csv('census_voter_data/census_voter_data.csv')
{% endhighlight %}
{% include code-panel-close.html %}

Now we have all of the data we need in raw form: all we have to do is join them on the state and year.
There's one implicit assumption that we'll have to make: for each House district the turnout is the same as the state.
Obviously that isn't true, but we don't have district-level turnout data so it's the best we can do with the data available.
We should be able to assess the impact of the assumption by removing the House races and seeing if there's a difference in the end results.
We do need to make one adjustment to the FEC data and divide the percentage values by 100.
This might be fixed in a later version of the dataset (meaning I will fix it since I maintain it), so double check if you run the notebook.

{% include code-panel-open.html panel_id="three" %}
{% highlight r %}
election <- fec %>%
  # Get only Republicans and Democrats.
  filter(party == "Republican" | party == "Democratic", 
         !is.na(pct),
         election == "general") %>%
  # Divide voter percentage for FEC data by 100 to match census data.
  mutate(pct=pct/100) %>%
  # Join to census data.
  inner_join(census.turnout, by=c("year", "state")) %>%
  # There are a few elections for the House that have multiple 
  # candidates on the ballot from the same party.
  # We'll select the top-most winner.
  group_by(year, state, chamber, district, election, party) %>%
  # Sort by vote percentage.
  arrange(year, state, chamber, election, party, desc(pct)) %>%
  # Drop the non-winners for each party.
  filter(row_number(desc(pct)) == 1) %>%
  ungroup()
{% endhighlight %}
{% include code-panel-close.html %}

The simplest thing we can do is check how the voter percentage correlates to the vote percentage.

{% include code-panel-open.html panel_id="four" %}
{% highlight r %}
ggplot(election, aes(x=voter_pct_of_total, y=pct, color=party)) + 
  geom_point(alpha=0.1) + 
  geom_smooth(method='lm') +
  scale_color_manual(values = c("blue", "red")) +
  labs(x = 'Voter Turnout (percent)',
       y = 'Vote (percent)',
       color = 'Party',
       title='Turnout vs Votes by Party')
{% endhighlight %}
{% include code-panel-close.html %}

<img src="{{site.url}}/images/election-turnout/turnout_votes_by_party_all.png" style="height:100%;width:100%">

Well it looks like the Democrats are on to something, but it's pretty thin.
Taking out the House races will remove a lot of noise.
Elections for House seats tend to be all over the place in terms of vote percentages, plus the real turnout for those elections isn't available since the turnout percentages are at the state level.
Let's take out our House races and see if the story changes.

{% include code-panel-open.html panel_id="five" %}
{% highlight r %}
ggplot(election %>% filter(chamber != "H"),
       aes(x=voter_pct_of_total, y=pct, color=party)) +
  geom_point(alpha=0.1) +
  geom_smooth(method='lm') +
  scale_color_manual(values=c("blue","red")) +
  labs(x = 'Voter Turnout (percent)',
       y = 'Vote (percent)',
       color = 'Party',
       title='Turnout vs Votes by Party')
{% endhighlight %}
{% include code-panel-close.html %}

<img src="{{site.url}}/images/election-turnout/turnout_votes_no_house.png" style="height:100%;width:100%">

Looks like the Democrats' story is beginning to shape up.
Let's take a look at the actual correlations.

{% include code-panel-open.html panel_id="six" %}
{% highlight r %}
rep <- election %>% filter(chamber != "H", 
                           party == "Republican")
dem <- election %>% filter(chamber != "H",
                           party == "Democratic")

print(str_c("Republican Correlation: ", cor(rep$voter_pct_of_total, rep$pct)))
print(str_c("Democrat Correlation: ", cor(dem$voter_pct_of_total, dem$pct)))
{% endhighlight %}
{% include code-panel-close.html %}

```shell
Republican Correlation: -0.0852
Democrat Correlation: 0.0812
```

This is huge folks.
The correlation between turnout and vote percentage is over _two hundred percent_ higher for Democrats than Republicans.
Data scientists can spin numbers too.
You get that for free, Democrats.
You're welcome.

So _technically_ there is a correlation, and if you're willing to accept 0.08 as reasonable evidence (I'm not, more on that in a moment) then looks like the Democrats' claim is correct; when turnout is higher, Democrats tend to win.
There are a couple of issues with this.
For one thing the data's very noisy, meaning the linear relationship the correlation coefficient is explaining - the amount of variance in vote percentage explained by variance in turnout - doesn't look great.
If we were to look at the $$r^2$$ value of the model we'd get a very low value, meaning the data's non-linear.
It isn't as though when turnout gets above 62% Democrats suddenly start winning anyway.
In my opinion correlation is a pretty weak way to tackle this problem.

A better way to phrase the question is this: is the turnout higher when the Democrats win?
It seems like the same question, but there's a really subtle difference between it and the original question.
The original question - the one "answered" by the correlation coefficient - went something like this: Do Democrats perform better when turnout is higher? 
The outcome we're explaining is continuous, so it's essentially a curve fitting exercise except the curve is really complicated and nonlinear.
When the question is "Do Democrats win more when turnout is higher?" we're basically taking the elections, throwing them into "Democrat win" and "Republican win" buckets, and looking at the turnout distributions.
The answer then is whether there's a significant difference between the two distributions.

{% include code-panel-open.html panel_id="seven" %}
{% highlight r %}
election.win <- election %>%
  # Take out the House elections.
  filter(chamber != "H") %>%
  # Get just the fields we need.
  select(year, state, chamber, party, pct, voter_pct_of_total) %>%
  # Fan the parties into their own columns.
  spread(party, pct, fill=0) %>%
  # Create a column that states the winner.
  mutate(winner=if_else(Republican > Democratic, 'Republican', 'Democrat')) %>%
  # Grab the winner and the vote percentage.
  select(winner, voter_pct_of_total)
{% endhighlight %}
{% include code-panel-close.html %}

Now there are two distributions that we want to find the difference between.
To put them side-by-side I'm going to use a [violin plot](https://en.wikipedia.org/wiki/Violin_plot), which plots the density (essentially _how many_ points) of each value in the distribution on the x-axis for each party.
The wider the curve, the more points of or near that value there are.
I've also put the points themselves for reference.
This is what the distributions look like.

{% include code-panel-open.html panel_id="eight" %}
{% highlight r %}
ggplot(election.win, aes(x=winner, y=voter_pct_of_total)) + 
  geom_violin(alpha=0.3, aes(fill=winner), draw_quantiles = 0.5) + 
  geom_jitter(alpha=0.5, aes(color=winner)) +
  scale_color_manual(values=c("blue", "red")) +
  scale_fill_manual(values=c("blue", "red")) +
  labs(x = 'Winning Party',
       y = 'Voter Turnout (percent)',
       title = 'Turnout by Winning Party',
       color = 'Winning Party',
       fill = 'Winning Party')
{% endhighlight %}
{% include code-panel-close.html %}

<img src="{{site.url}}/images/election-turnout/turnout_by_winning_party.png" style="height:100%;width:100%">

Well this is tough to see.
I drew the median values to make it a little more clear.
It looks like the Dems are right if you squint hard enough, but is there really anything there?

There are several ways to get the answer - one option is to use traditional inference techniques, which woud involve modeling the distribution of turnouts for the Democrat and Republican wins and performing a significance test.
This would give a p-value that would determine whether it's statistically significant provided we define precisely what we mean by statistically significant in the first place.
Well I'm not a statistician and I _really_ don't like p-values, so I'll take a Bayesian approach instead.
This question can be answered directly using Markov Chain Monte Carlo ([MCMC](https://en.wikipedia.org/wiki/Markov_chain_Monte_Carlo)) on a [Bayesian Network](https://en.wikipedia.org/wiki/Bayesian_network).

The idea behind Bayesian networks is to model not just the variables we observe, but the parameters to their distributions as well using conditional probabilities.
The model outputs _distributions_ - called posterior distributions - of the parameters to the observed variables which can then be used to perform inference.
If it's confusing go ahead and read on.
I think when you see the model itself it'll be pretty clear, even if the details aren't intuitive.

There's a fantastic package, [pymc](https://pymc-devs.github.io/pymc/), that makes it very easy to build these models and perform MCMC sampling on them, but it's in Python and I've been working in R.
Thankfully it's not too hard to transfer data - for this I'll use the [feather](https://blog.rstudio.org/2016/03/29/feather/) package.
After the model's been run I can save those results with the Python feather (oddly enough called `feather-format` on PyPI) and read them back into R.
The [RStudio notebook](http://rmarkdown.rstudio.com/r_notebooks.html) I wrote this in can actually run both at the same time, which is a pretty sweet feature.

{% include code-panel-open.html panel_id="nine" %}
{% highlight r %}
library(feather)

# pymc is in Python, so serialize the data to disk so we can read it in.
write_feather(election.win, 'election_win.feather')
{% endhighlight %}
{% include code-panel-close.html %}

This is what the model will look like graphically.

<img src="{{site.url}}/images/election-turnout/election_turnout_model.png" style="height:100%;width:100%">

The "bottom-most" layer of the Bayesian network will contain the observed variables - the voter turnout for Democrat and Republican winners.
Since the voter turnout is between zero and one I'm going to choose the [beta distribution](https://en.wikipedia.org/wiki/Beta_distribution) to model the turnouts for the Democrats and Republicans.

$$
\text{turnout}_D \sim \text{Beta}(\alpha_D, \beta_D) \\
\text{turnout}_R \sim \text{Beta}(\alpha_R, \beta_R)
$$

It has the property that it's always between zero and one as well as other nice properties that will make it easy to compute the probability we're looking for.

The "upper" layer consists of the hyper-parameters for the betas.
Each of the betas needs two shape parameters, $$\alpha$$ and $$\beta$$, which are any value greater than zero.
Since there isn't a strong case for what those should be, I've chosen a $$\text{Unif}(0,100)$$ as the prior.
It really should be $$\text{Unif}(0, \inf)$$, but practically speaking I think 100 is a reasonable limit.
The data will shape those distributions into something useful when it's sampled.

$$
\alpha_D \sim \text{Unif}(0, 100) \\
\beta_D \sim \text{Unif}(0, 100) \\
\alpha_R \sim \text{Unif}(0, 100) \\
\beta_R \sim \text{Unif}(0, 100)
$$

The final piece is what actually answers the question.
The inferred $$\alpha$$ and $$\beta$$ parameters can be used to calculate the mean of each party distribution with the following equation: $$\frac{\alpha}{\alpha + \beta}$$.
I've put in two versions: one with the absolute value of the difference (answering _Is there a difference between turnouts depending on the party?_), and the Democrat mean minus the Republican one (answering _Is the turnout higher when the Democrats win?_).

$$
|\Delta(mean)| = \left| \frac{\alpha_D}{\alpha_D + \beta_D} - \frac{\alpha_R}{\alpha_R + \beta_R} \right|  \\
\Delta(mean) = \frac{\alpha_D}{\alpha_D + \beta_D} - \frac{\alpha_R}{\alpha_R + \beta_R}
$$

The final result of the model is a distribution of differences between means for the Republicans and Democrats, both the absolute value and the Democrats minus Republicans.
That's how we get the probability that will answer our question.

{% include code-panel-open.html panel_id="ten" %}
{% highlight python %}
import feather
import pandas as pd
import pymc

election_win = feather.read_dataframe('election_win.feather')

republican_wins = \
  election_win[election_win.winner == 'Republican'].voter_pct_of_total
democrat_wins = \
  election_win[election_win.winner == 'Democrat'].voter_pct_of_total

# 100 is kind-of an arbitrary cutoff.  
rep_alpha = pymc.Uniform('rep_alpha', lower=0, upper=100)
rep_beta = pymc.Uniform('rep_beta', lower=0, upper=100)
dem_alpha = pymc.Uniform('dem_alpha', lower=0, upper=100)
dem_beta = pymc.Uniform('dem_beta', lower=0, upper=100)

# Now put in the deterministic layer.

# Distribution of Democrat > Republican.
@pymc.deterministic
def dem_gt_rep(ra=rep_alpha, rb=rep_beta, da=dem_alpha, db=dem_beta):
  rep_mean = ra / (ra + rb)
  dem_mean = da / (da + db)
  return dem_mean - rep_mean
  
# Distribution of Democrat != Republican.
@pymc.deterministic
def dem_diff_rep(ra=rep_alpha, rb=rep_beta, da=dem_alpha, db=dem_beta):
  rep_mean = ra / (ra + rb)
  dem_mean = da / (da + db)
  return abs(dem_mean - rep_mean)
  
# Now the observed layer.
dem_turnout = pymc.Beta('dem_turnout', 
                        alpha=dem_alpha, beta=dem_beta,
                        observed=True, value=democrat_wins)
rep_turnout = pymc.Beta('rep_turnout',
                        alpha=rep_alpha, beta=dem_beta,
                        observed=True, value=republican_wins)

# Finally, build the model and sample for inference.
model = pymc.MCMC([rep_alpha, rep_beta, dem_alpha, dem_beta, 
                   dem_gt_rep, dem_diff_rep,
                   rep_turnout, dem_turnout])
model.sample(iter=150000, burn=10000, thin=10, 
             verbose=False, progress_bar=False)
             
# Now write the samples out so we can analyze in R.
model_samples = {
  'dem_gt_rep': model.trace('dem_gt_rep')[:],
  'dem_diff_rep': model.trace('dem_diff_rep')[:],
  'dem_alpha': model.trace('dem_alpha')[:],
  'dem_beta': model.trace('dem_beta')[:],
  'rep_alpha': model.trace('rep_alpha')[:],
  'rep_beta': model.trace('rep_beta')[:]
}

election_win_samples = pd.DataFrame(data=model_samples)

feather.write_dataframe(election_win_samples, 'election_win_samples.feather')
{% endhighlight %}
{% include code-panel-close.html %}

It's never a bad idea to run the model without the observations turned on so we can visually compare the distributions before and after the data is added.

{% include code-panel-open.html panel_id="eleven" %}
{% highlight python %}
import feather
import pandas as pd
import pymc

election_win = feather.read_dataframe('election_win.feather')

republican_wins = \
  election_win[election_win.winner == 'Republican'].voter_pct_of_total
democrat_wins = \
  election_win[election_win.winner == 'Democrat'].voter_pct_of_total

# 100 is kind-of an arbitrary cutoff.  
rep_alpha = pymc.Uniform('rep_alpha', lower=0, upper=100)
rep_beta = pymc.Uniform('rep_beta', lower=0, upper=100)
dem_alpha = pymc.Uniform('dem_alpha', lower=0, upper=100)
dem_beta = pymc.Uniform('dem_beta', lower=0, upper=100)

# Now put in the deterministic layer.

# Distribution of Democrat > Republican.
@pymc.deterministic
def dem_gt_rep(ra=rep_alpha, rb=rep_beta, da=dem_alpha, db=dem_beta):
  rep_mean = ra / (ra + rb)
  dem_mean = da / (da + db)
  return dem_mean - rep_mean
  
# Distribution of Democrat != Republican.
@pymc.deterministic
def dem_diff_rep(ra=rep_alpha, rb=rep_beta, da=dem_alpha, db=dem_beta):
  rep_mean = ra / (ra + rb)
  dem_mean = da / (da + db)
  return abs(dem_mean - rep_mean)
  
# Now the observed layer.
dem_turnout = pymc.Beta('dem_turnout', 
                        alpha=dem_alpha, beta=dem_beta,
                        observed=False, value=democrat_wins)
rep_turnout = pymc.Beta('rep_turnout',
                        alpha=rep_alpha, beta=dem_beta,
                        observed=False, value=republican_wins)

# Finally, build the model and sample for inference.
model = pymc.MCMC([rep_alpha, rep_beta, dem_alpha, dem_beta, 
                   dem_gt_rep, dem_diff_rep,
                   rep_turnout, dem_turnout])
model.sample(iter=150000, burn=10000, thin=10, 
             verbose=False, progress_bar=False)
             
# Now write the samples out so we can analyze in R.
model_samples = {
  'dem_gt_rep': model.trace('dem_gt_rep')[:],
  'dem_diff_rep': model.trace('dem_diff_rep')[:],
  'dem_alpha': model.trace('dem_alpha')[:],
  'dem_beta': model.trace('dem_beta')[:],
  'rep_alpha': model.trace('rep_alpha')[:],
  'rep_beta': model.trace('rep_beta')[:]
}

election_win_samples = pd.DataFrame(data=model_samples)

feather.write_dataframe(election_win_samples, 'election_win_samples_unobserved.feather')
{% endhighlight %}
{% include code-panel-close.html %}

{% include code-panel-open.html panel_id="twelve" %}
{% highlight r %}
election.win.samples <- 
  read_feather('election_win_samples.feather') %>% 
    mutate(observed=TRUE) %>% 
  union_all(read_feather('election_win_samples_unobserved.feather') %>% 
     mutate(observed=FALSE))
{% endhighlight %}
{% include code-panel-close.html %}

The model was set up to actually answer two questions:

1. What's the probability that there's a difference between voter turnout when the Democrats win than when Republicans win?
2. What's the probability that the voter turnout is higher when the Democrats win than when Republicans win?

The subtle difference between those two questions may affect the confidence in the answer (i.e. higher probability the answer is "yes"), or there may be no effect.
Let's find out.

{% include code-panel-open.html panel_id="thirteen" %}
{% highlight r %}
ggplot(election.win.samples, aes(dem_diff_rep, fill=observed)) +
  geom_density(alpha=0.3) +
  labs(title='Difference Between Turnouts (Observed and Unobserved)',
       x = 'Turnout Difference',
       y = 'Density',
       fill = 'Observed')
{% endhighlight %}
{% include code-panel-close.html %}

<img src="{{site.url}}/images/election-turnout/turnout_model_diff.png" style="height:100%;width:100%">

This is the probability distribution of the variable that defines whether there's a difference in voter turnout when Democrats win versus Republicans.
So to determine whether there's a difference, pick some threshold as a significant difference (say, five percent turnout) and count the samples that fit the criteria.
Note that this is different from statistical significance: the threshold defining what we want is on the variable we care about, not a statistical calculation.

{% include code-panel-open.html panel_id="fourteen" %}
{% highlight r %}
num.samples <- election.win.samples %>%
  filter(observed == TRUE) %>%
  nrow

num.diff.samples <- election.win.samples %>%
  filter(observed == TRUE, dem_diff_rep > 0.05) %>%
  nrow

num.diff.samples.unobserved <- election.win.samples %>%
  filter(observed == FALSE, dem_diff_rep > 0.05) %>%
  nrow


print(
  str_c("Probability that the voter turnout is different when Democrats win (no data): ",
        num.diff.samples.unobserved / num.samples))
print(
  str_c("Probability that the voter turnout is different when Democrats win: ",
        num.diff.samples / num.samples))
{% endhighlight %}
{% include code-panel-close.html %}

```shell
Probability that the voter turnout is different when Democrats win (no data): 0.885
Probability that the voter turnout is different when Democrats win: 0.952
```

Well there it is, there's a 95 percent chance that there's a difference in voter turnout for different parties.
With no data, it's 88 percent, so the model is biased that there's a difference.
This isn't actually surprising - there probably _is_ a difference.
Most of the samples are expected to be more than 0.05 apart.
But is it different in the way the Democrats claim?
Is the voter turnout higher when the Democrats win?

{% include code-panel-open.html panel_id="fifteen" %}
{% highlight r %}
ggplot(election.win.samples, aes(dem_gt_rep, fill=observed)) +
  geom_density(alpha=0.3) +
  labs(title = 'Democrat Turnout Higher than Republicans',
       x = 'Democrat Turnout Minus Republican Turnout',
       y = 'Density',
       fill = 'Observed')
{% endhighlight %}
{% include code-panel-close.html %}

<img src="{{site.url}}/images/election-turnout/turnout_dem_diff.png" style="height:100%;width:100%">

Wow.
The plot makes it pretty clear there's a high probability that something's going on.
Here's the actual number.

{% include code-panel-open.html panel_id="sixteen" %}
{% highlight r %}
num.samples <- election.win.samples %>%
  filter(observed == TRUE) %>%
  nrow

num.gt.samples <- election.win.samples %>%
  filter(observed == TRUE, dem_gt_rep > 0.05) %>%
  nrow

num.gt.samples.unobserved <-
  election.win.samples %>%
  filter(observed == FALSE, dem_gt_rep > 0.05) %>%
  nrow

print(str_c("Probability that the voter turnout is higher when Democrats win (no data): ", 
            num.gt.samples.unobserved / num.samples))
print(str_c("Probability that the voter turnout is higher when Democrats win: ", 
            num.gt.samples / num.samples))
{% endhighlight %}
{% include code-panel-close.html %}

```shell
Probability that the voter turnout is higher when Democrats win (no data): 0.435
Probability that the voter turnout is higher when Democrats win: 0.854
```

So based on the data (and the model), there's about an 85 percent chance that the voter turnout is higher when Democrats win, compared to a model baseline of about 45 percent.
I'm going to call this one and say the Democrats are on to something here.
After all, the probability of President-elect Trump winning was a lot lower than 85 percent.

## Conclusion

We checked out voter turnout and election result data for 2000-2014 and determined there was a slight correlation between turnout and Democrat win percentage.
By reframing the question we were able to use a Bayesian model to determine that there's about an 86 percent chance turnout is higher when Democrats win than Republicans.
So what's next?
I think the most important thing to improve the results is to get more data.
That would probably make the result distributions a lot more clear about what the answer is.
It would also mitigate what is probably the biggest confounding factor:

![](http://a5.files.biography.com/image/upload/c_fill,cs_srgb,dpr_1.0,g_face,h_300,q_80,w_300/MTE4MDAzNDEwNzg5ODI4MTEw.jpg)

In 2008, along with Sarah Palin and the epic Wall Street crash, then-Senator Barack Obama drew a national turnout of 57%, the highest in _four decades_ ([source](https://en.wikipedia.org/wiki/Voter_turnout_in_the_United_States_presidential_elections)).
Moreover, he's the only winning Democrat president in the dataset, and that matters.
It's not unreasonable to assume that the incumbent president's political party has an effect on the elections.
More data would bring in more Democrat presidential incumbents and ideally average out some of the Obama effect.

## tl;dr

A direct correlation analysis doesn't really show it well, but there's a pretty high chance (~85% according to a Bayesian model) that the Democrats tend to win when voter turnout is high.
Want to run the notebook? Hit the [GitHub Repo](https://github.com/timothyrenner/election-turnout-analysis).

## Thanks

Huge thanks to [Randi Ludwig](https://www.linkedin.com/in/randi-r-ludwig-717150114) and [Deepsagar Lambor](https://www.linkedin.com/in/deepsagar-lambor-4aa1233a) for reviewing this post.
