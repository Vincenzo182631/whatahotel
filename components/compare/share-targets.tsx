"use client";

import { useState } from "react";
import { Mail, MessageSquare, Link2, Check } from "lucide-react";

/**
 * Mobile-style "pick an app" chooser for the /compare share flow on desktop web,
 * where the browser's native OS share sheet isn't reliably available. Each tile
 * opens that destination pre-filled with the link (and a short message). The URL
 * is rebuilt fresh on every click via `getUrl`, so late edits to the personal
 * note still apply.
 */

type Target = {
  key: string;
  label: string;
  color: string;
  href: (url: string, msg: string) => string;
  icon: React.ReactNode;
};

const enc = encodeURIComponent;

// Compact inline brand glyphs — lucide dropped brand icons, so we ship our own.
const WhatsAppIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.729-.979zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.767.967-.94 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.612-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);
const XIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-[18px]" aria-hidden>
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);
const FacebookIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);
const LinkedInIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.225 0z" />
  </svg>
);
const TelegramIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="size-5" aria-hidden>
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
  </svg>
);

const TARGETS: Target[] = [
  {
    key: "whatsapp",
    label: "WhatsApp",
    color: "#25D366",
    href: (url, msg) => `https://wa.me/?text=${enc(`${msg} ${url}`)}`,
    icon: WhatsAppIcon,
  },
  {
    key: "email",
    label: "Email",
    color: "#EA4335",
    href: (url, msg) =>
      `mailto:?subject=${enc("Hotel comparison — WhataHotel")}&body=${enc(`${msg}\n\n${url}`)}`,
    icon: <Mail className="size-5" strokeWidth={1.75} aria-hidden />,
  },
  {
    key: "x",
    label: "X",
    color: "#000000",
    href: (url, msg) => `https://twitter.com/intent/tweet?text=${enc(msg)}&url=${enc(url)}`,
    icon: XIcon,
  },
  {
    key: "facebook",
    label: "Facebook",
    color: "#1877F2",
    href: (url) => `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`,
    icon: FacebookIcon,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    color: "#0A66C2",
    href: (url) => `https://www.linkedin.com/sharing/share-offcanvas/?url=${enc(url)}`,
    icon: LinkedInIcon,
  },
  {
    key: "telegram",
    label: "Telegram",
    color: "#26A5E4",
    href: (url, msg) => `https://t.me/share/url?url=${enc(url)}&text=${enc(msg)}`,
    icon: TelegramIcon,
  },
  {
    key: "sms",
    label: "SMS",
    color: "#34C759",
    href: (url, msg) => `sms:?&body=${enc(`${msg} ${url}`)}`,
    icon: <MessageSquare className="size-5" strokeWidth={1.75} aria-hidden />,
  },
];

/** A short message that rides along with the link on apps that take a caption. */
const MESSAGE = "Take a look at this hotel comparison on WhataHotel:";

export function ShareTargets({
  getUrl,
  onDone,
}: {
  /** Rebuilds the share URL fresh at click time so late edits still apply. */
  getUrl: () => string;
  /** Called after a destination is chosen (e.g. to close the popover). */
  onDone?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator?.clipboard?.writeText(getUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const tile =
    "flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-center transition-colors hover:bg-black/[0.04]";

  return (
    <div>
      <p className="mb-2 text-xs font-medium text-[#717171]">Share to…</p>
      <div className="grid grid-cols-4 gap-1">
        {TARGETS.map((t) => (
          <a
            key={t.key}
            href={t.href(getUrl(), MESSAGE)}
            target="_blank"
            rel="noreferrer"
            onClick={() => onDone?.()}
            className={tile}
          >
            <span
              className="flex size-11 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: t.color }}
            >
              {t.icon}
            </span>
            <span className="text-[11px] leading-tight text-[#333]">{t.label}</span>
          </a>
        ))}

        {/* Copy tile — same footprint as an app, re-copies the link. */}
        <button type="button" onClick={copy} className={tile}>
          <span className="flex size-11 items-center justify-center rounded-full bg-[#FF385C] text-white">
            {copied ? <Check className="size-5" /> : <Link2 className="size-5" />}
          </span>
          <span className="text-[11px] leading-tight text-[#333]">{copied ? "Copied!" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}
