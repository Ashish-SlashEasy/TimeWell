import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help Center — Timewell",
  description: "Setup guides, FAQs, and tips for getting the most out of Timewell.",
};

// ── Article data ─────────────────────────────────────────────────────────────

interface Article {
  slug: string;
  title: string;
  summary: string;
}

const ARTICLES: Article[] = [
  {
    slug: "getting-started",
    title: "Getting started with Timewell",
    summary: "Create your first card, upload a cover photo, and share the link with your guests.",
  },
  {
    slug: "contributions",
    title: "Collecting contributions",
    summary: "Let guests upload photos, videos, and audio messages directly from their phones — no app download needed.",
  },
  {
    slug: "ordering",
    title: "Ordering your printed card",
    summary: "Review your card, enter a shipping address, and place your print order in minutes.",
  },
  {
    slug: "account",
    title: "Managing your account & credits",
    summary: "Update your profile, track card credits, and understand how the quota system works.",
  },
];

// ── FAQ data ─────────────────────────────────────────────────────────────────

interface Faq {
  q: string;
  a: string;
}

const FAQS: Faq[] = [
  {
    q: "How many cards can I create?",
    a: "Each account comes with a set number of card credits. You can see your remaining credits at the top of your Home dashboard. Additional credits can be purchased from the Buy page.",
  },
  {
    q: "What file types can guests upload?",
    a: "Guests can upload JPEG, PNG, and WebP photos (up to 15 MB), MP4, MOV, and WebM videos (up to 200 MB), and MP3, M4A, and WebM audio recordings (up to 200 MB).",
  },
  {
    q: "Can I password-protect my card?",
    a: "Yes. In the card editor, open Settings and enable password protection. Only guests with the password will be able to view the card and add contributions.",
  },
  {
    q: "How long does printing and shipping take?",
    a: "Print production typically takes 2–3 business days. Shipping time depends on your selected carrier and location. You will receive a tracking number by email once your order ships.",
  },
  {
    q: "Can I edit my card after ordering?",
    a: "No. Once a print order is submitted the card is locked. Make sure you are happy with the cover photo, title, and message before placing the order.",
  },
  {
    q: "How do I download my QR code?",
    a: 'Open the card in the editor and look for the "Download QR Code" button in the sidebar. The QR code is generated automatically when you place your order.',
  },
];

// ── Components ────────────────────────────────────────────────────────────────

function ArticleCard({ article }: { article: Article }) {
  return (
    <Link
      href={`/help/${article.slug}`}
      className="block bg-muted/40 hover:bg-muted/70 border border-border rounded-2xl px-6 py-5 transition-colors group"
    >
      <p className="font-serif text-lg font-medium text-foreground group-hover:underline underline-offset-2">
        {article.title}
      </p>
      <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{article.summary}</p>
    </Link>
  );
}

function FaqItem({ faq }: { faq: Faq }) {
  return (
    <div className="border-b border-border py-5">
      <p className="font-medium text-foreground">{faq.q}</p>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-16 space-y-16">

        {/* Header */}
        <div className="space-y-3 text-center">
          <h1 className="font-serif text-5xl font-normal text-foreground">Help Center</h1>
          <p className="text-muted-foreground text-base max-w-md mx-auto">
            Guides, FAQs, and tips for getting the most out of Timewell.
          </p>
        </div>

        {/* Articles */}
        <section className="space-y-4">
          <h2 className="font-serif text-2xl text-foreground">Setup guides</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {ARTICLES.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="space-y-2">
          <h2 className="font-serif text-2xl text-foreground">Frequently asked questions</h2>
          <div>
            {FAQS.map((f) => (
              <FaqItem key={f.q} faq={f} />
            ))}
          </div>
        </section>

        {/* Contact CTA */}
        <section className="bg-muted/40 rounded-2xl px-8 py-10 text-center space-y-4">
          <h3 className="font-serif text-2xl text-foreground">Still need help?</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Our support team is happy to help. Send us a message and we&apos;ll get back to you within one business day.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-md bg-primary text-primary-foreground px-5 h-10 text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Back to dashboard
          </Link>
        </section>
      </div>
    </div>
  );
}
