# Monetizely Take-Home Exercise: A Small Quoting Tool

Hi, and thanks for taking the time to do this. The exercise below is what we'd like you to build. Please read it end-to-end before starting.

## A bit of context

At Monetizely, we work with SaaS companies to design and operationalize their pricing. A lot of our work ends up looking like this: a client tells us what they sell, how they sell it, and how they want to price it - and we help them turn that into something their sales team can actually use to put quotes in front of customers.

We want a small tool that does exactly that. Think of it as a lightweight quoting application that an analyst at our firm could use to model a client's pricing on the screen and produce an actual quote for one of their customers.

## What we want you to build

There are really two parts to this. Both need to work.

### Part 1: A place to set up the pricing

Before we can build a quote, we need somewhere to define what's being sold. This is the "catalog setup" part of the tool.

A client of ours sells **products**. Each product comes in different **tiers** - usually something like Starter, Growth, and Enterprise - and each tier has a base price (charged per seat, per month).

Each product also has a list of **features**. Here's where it gets interesting: any given feature can show up in any tier in one of three ways:

- **Included** - the feature is part of that tier at no extra cost
- **Available as a paid add-on** - the customer doesn't get it automatically, but they can buy it on top
- **Not available at all** - this feature simply isn't offered at this tier

So you might have a feature called "Single Sign-On" that's not available on Starter, is a paid add-on on Growth, and is included in Enterprise. That's normal. Real SaaS products work exactly this way.

For the features that are sold as paid add-ons, the **price** of the add-on depends on the tier (the same feature can cost differently on Growth than on Enterprise) and can follow one of three pricing models:

- **Fixed monthly price** - for example, "$200 per month, period"
- **Per-seat price** - for example, "$50 per seat per month"
- **Percentage of the product price** - for example, "10% of the product cost"

The catalog setup screens should let our analyst define all of this: create products, define their tiers and base prices, list features, decide for each feature in each tier whether it's included / an add-on / not available, and for add-ons specify which of the three pricing models applies and the actual numbers.

We've attached an Excel file (**`catalog-example.xlsx`**) that shows you exactly how one of our clients' catalogs looks. You should be able to set up something equivalent in your tool. The Excel is for reference - we're not asking you to import it, just to understand the shape of the data.

### Part 2: The quote builder itself

Once the catalog is set up, our analyst should be able to build a quote for a customer. Here's roughly how that flow should feel:

1. Start a new quote. Give it a name (something like "Acme Corp - Q3 2026 proposal").
2. Choose which product the customer is buying.
3. Choose which tier of that product they're on.
4. Choose how many seats they need.
5. Choose a term length - we offer monthly, annual, or two-year. Annual gets a 15% discount on the per-seat price; two-year gets a 25% discount. (These are standard terms across all our clients - they don't change per product.)
6. The tool should now show the analyst which add-ons are available for the tier they picked, and let them select any combination of those.
   - For each add-on selected, the analyst may need to provide more information - for instance, if it's a per-seat add-on, how many seats? If it's a fixed-price add-on, no extra input needed.
7. Optionally, apply a discount to the quote (as a percentage).
8. Save the quote.

When the quote is saved, the tool should produce a clean quote view that shows:

- Who the quote is for
- What product, tier, and term length is being proposed
- A line-item breakdown showing each cost component and how it was calculated
- The total

The quote view should be accessible via its own URL that the analyst can share. The person we're sending the quote to should be able to open that URL and see the quote without logging in - it's basically a read-only document at that point.

We've attached an Excel file (**`sample-quote.xlsx`**) that shows an example of what a completed quote should look like in terms of the information it presents and how the math is broken down.

## Some things we care about

A few things matter to us beyond just "does it work":

**The math has to be right and visible.** When the analyst (or the customer) looks at the quote, they should be able to see clearly how each number was arrived at. We don't want a quote that just says "$47,500 total" - we want to see the line items and how they were computed.

**Your tool should be deployed and usable.** Please host it on **Vercel** and send us a link where we can actually use it. We should be able to set up a small catalog and produce a quote from scratch, and open a shareable quote URL.

**We want your code on GitHub.** Please share the repository link as well - public or private (if private, share access with whoever sent you this exercise).

**Please include tests.** We expect both:

- Unit tests covering the pricing math (especially around the different add-on pricing models and the discount logic)
- At least one end-to-end test that walks through creating a catalog entry, building a quote, and viewing the saved quote

**Please include a short README** that covers:

- How to run the tool locally
- Any assumptions you made about how something should work
- Any decisions where you had to pick between reasonable options - tell us what you picked and why
- Any questions you would have asked us if you had the chance
- What you would build next if you had more time

**Use whatever AI coding tools you normally use.** We use Claude Code and similar tools heavily ourselves. We're not testing whether you can write code from scratch with no help - we're testing whether you can produce a working, well-thought-out application end to end. How you get there is your business.

## Some things we don't care about

To save you time, here's what we are **not** asking for in this exercise:

- A signup / login / multi-user system. A simple way to access the tool is fine.
- Payment processing, e-signature, or actually sending the quote to anyone
- A polished marketing landing page. We're looking at the actual quoting tool, not at how pretty the home page is.
- Multiple currencies, tax calculation, or PDF generation. USD only, no tax, on-screen quote view is fine.
- Editing existing quotes after they've been saved (creating new ones is enough).
- The ability to delete things from the catalog (creating and editing is enough).

## What to send us

Once you're done, please reply to the recruiter with:

1. The link to your deployed application on Vercel
2. The link to your GitHub repository
3. Your README (in the repo is fine - just point us to it)

We'll review what you send and follow up with an interview where we'll mostly talk about your process, the decisions you made, and what you'd do differently. There's no whiteboard coding round after this - this exercise is the technical evaluation.

## Tech stack

Use **Node.js, TypeScript, and Next.js** for the application. Pick whichever database you want from **Postgres, SQLite, or MongoDB** - whatever you can deploy most cleanly on Vercel.

## Timing

Please send us your submission as soon as you can produce something you'd be comfortable showing to a client. We're moving quickly on this hire, so we'd appreciate a fast turnaround, but we'd rather see good work than rushed work.

---

If anything in this brief is genuinely blocking you and you need to ask, you can - but bear in mind that part of what we're looking at is how you handle judgment calls in ambiguous situations, which is what most of the actual job looks like. Document your thinking in the README and you'll probably be fine.

Good luck. We're looking forward to seeing what you build.
