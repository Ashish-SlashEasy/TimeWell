import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

// ── Article content ───────────────────────────────────────────────────────────

interface Section {
  heading?: string;
  body: string;
  list?: string[];
}

interface ArticleContent {
  title: string;
  intro: string;
  sections: Section[];
}

const ARTICLES: Record<string, ArticleContent> = {
  "getting-started": {
    title: "Getting started with Timewell",
    intro:
      "Timewell lets you create a beautiful digital memory card that your guests can contribute to with photos, videos, and voice messages. Here's how to set up your first card.",
    sections: [
      {
        heading: "1. Create a card",
        body: "From your Home dashboard click the + New button in the top-right corner. Give your card a title (up to 40 characters) and an optional message (up to 80 characters). Choose a landscape or portrait orientation to match your cover photo.",
      },
      {
        heading: "2. Upload a cover photo",
        body: "Open the Image tab in the card editor and upload a high-quality photo (JPEG, PNG, or WebP, up to 15 MB). Timewell automatically generates a web-ready composite card image with a QR code badge — no design skills required.",
      },
      {
        heading: "3. Share the link",
        body: "Copy your card's share link from the editor header and send it to your guests via text, email, or print the QR code and display it at your event. Guests can open the link on any device and start uploading immediately.",
      },
      {
        heading: "4. Review contributions",
        body: "Open the Contributions tab in the editor at any time to see what guests have uploaded. You can remove any contribution that doesn't belong.",
      },
      {
        heading: "Tips",
        body: "",
        list: [
          "Use a portrait photo for portrait cards and a landscape photo for landscape cards to get the best composite result.",
          "Enable password protection in Settings if you want to restrict access to invited guests only.",
          "Card credits are deducted when you create a card, not when you order a print.",
        ],
      },
    ],
  },

  contributions: {
    title: "Collecting contributions",
    intro:
      "The share page is where your guests add their memories. No account or app download is required — they just open the link and upload.",
    sections: [
      {
        heading: "What guests can upload",
        body: "Guests can share:",
        list: [
          "Photos — JPEG, PNG, WebP up to 15 MB",
          "Videos — MP4, MOV, WebM up to 200 MB",
          "Audio messages — recorded directly in the browser or uploaded as MP3 / M4A",
        ],
      },
      {
        heading: "How contributions appear",
        body:
          "Contributions show up in a gallery grid on the share page in real-time. Photos appear as square thumbnails, videos as tall cards, and audio as small waveform cards. All contributions are also visible to you in the Contributions tab of the card editor.",
      },
      {
        heading: "Moderation",
        body:
          "By default all uploaded contributions are set to public and visible on the share page. You can remove individual contributions from the Contributions tab inside the editor.",
      },
      {
        heading: "Turning contributions off",
        body:
          "If you want to lock the card so no new contributions can be added, open the card editor, go to Settings, and disable the Allow contributions toggle.",
      },
    ],
  },

  ordering: {
    title: "Ordering your printed card",
    intro:
      "Once your card is ready and your guests have contributed their memories, you can order a physical print. The card is printed on premium photo stock and shipped directly to you.",
    sections: [
      {
        heading: "Before you order",
        body: "Make sure:",
        list: [
          "You have uploaded a cover photo.",
          "Your title and message look exactly the way you want — they cannot be changed after ordering.",
          "You have reviewed the contributions and removed any you do not want included.",
        ],
      },
      {
        heading: "Placing the order",
        body: 'Click "Submit order for print" in the editor sidebar. Enter your shipping address and confirm. Once submitted the card is locked and a print job is created.',
      },
      {
        heading: "Tracking your order",
        body:
          "You will receive a shipping confirmation email with a tracking number once your order has been dispatched. You can also check the status from your Home dashboard.",
      },
      {
        heading: "Downloading your QR code",
        body:
          'After ordering, a "Download QR Code" link appears in the editor sidebar. The QR code is a high-resolution PNG you can print yourself, add to invitations, or display at an event.',
      },
    ],
  },

  account: {
    title: "Managing your account & credits",
    intro: "Your Timewell account controls your profile, card credits, and security settings.",
    sections: [
      {
        heading: "Card credits",
        body:
          "Each card you create consumes one credit. Your remaining credits are shown as a progress bar at the top of the Home dashboard. Archiving a card returns the credit to your balance. Deleting an archived card does not consume an additional credit.",
      },
      {
        heading: "Buying more credits",
        body: 'When your balance reaches zero, the + New button is disabled. Click "Buy Cards" in the dashboard banner or go to the Buy page to purchase additional credits.",',
      },
      {
        heading: "Updating your profile",
        body: "Go to Account in the sidebar to update your name, email address, or phone number. You can also change your password or enable two-factor authentication from this page.",
      },
      {
        heading: "Archiving vs. deleting cards",
        body:
          "Archived cards are hidden from your Home dashboard but their share pages remain accessible. Archived cards return one credit to your balance. Deleted cards are permanently removed and cannot be recovered.",
      },
    ],
  },
};

// ── Page ──────────────────────────────────────────────────────────────────────

export async function generateStaticParams() {
  return Object.keys(ARTICLES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const article = ARTICLES[params.slug];
  if (!article) return {};
  return { title: `${article.title} — Timewell Help` };
}

export default function ArticlePage({ params }: { params: { slug: string } }) {
  const article = ARTICLES[params.slug];
  if (!article) notFound();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-10">

        {/* Breadcrumb */}
        <nav className="text-sm text-muted-foreground flex items-center gap-2">
          <Link href="/help" className="hover:text-foreground transition-colors">Help Center</Link>
          <span>/</span>
          <span className="text-foreground">{article.title}</span>
        </nav>

        {/* Article */}
        <article className="space-y-8">
          <h1 className="font-serif text-4xl font-normal text-foreground leading-snug">{article.title}</h1>
          <p className="text-muted-foreground leading-relaxed">{article.intro}</p>

          {article.sections.map((section, i) => (
            <div key={i} className="space-y-3">
              {section.heading && (
                <h2 className="font-serif text-xl font-medium text-foreground">{section.heading}</h2>
              )}
              {section.body && (
                <p className="text-muted-foreground leading-relaxed">{section.body}</p>
              )}
              {section.list && (
                <ul className="space-y-1.5 pl-5">
                  {section.list.map((item, j) => (
                    <li key={j} className="text-sm text-muted-foreground leading-relaxed list-disc">{item}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </article>

        {/* Footer nav */}
        <div className="border-t border-border pt-8 flex items-center justify-between">
          <Link href="/help" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to Help Center
          </Link>
          <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Go to dashboard →
          </Link>
        </div>
      </div>
    </div>
  );
}
