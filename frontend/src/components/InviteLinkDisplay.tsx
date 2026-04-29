"use client";

import { Check, Copy, Share2 } from "lucide-react";
import { useEffect, useState } from "react";

export default function InviteLinkDisplay({
  code,
  groupName,
}: {
  code: string;
  groupName: string;
}) {
  const [origin, setOrigin] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    setCanShare(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const url = origin ? `${origin}/join/${code}` : "";

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const share = async () => {
    if (!url) return;
    try {
      await navigator.share({
        title: "Join my SummitStats group",
        text: `Join "${groupName}" on SummitStats`,
        url,
      });
    } catch {
      // User cancelled or share failed — silent.
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex-1 min-w-0 rounded-xl bg-white/5 ring-1 ring-white/10 px-3 py-2">
        <p className="font-mono text-xs sm:text-sm text-slate-300 truncate">
          {url || "…"}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        disabled={!url}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 ring-1 ring-white/10 hover:bg-white/10 px-3 py-2 text-sm font-medium text-slate-200 transition-colors disabled:opacity-50"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied" : "Copy"}
      </button>
      {canShare && (
        <button
          type="button"
          onClick={share}
          disabled={!url}
          className="inline-flex items-center gap-1.5 rounded-lg bg-orange-400 hover:bg-orange-500 px-3 py-2 text-sm font-bold text-slate-950 transition-colors disabled:opacity-50"
        >
          <Share2 size={14} />
          Share
        </button>
      )}
    </div>
  );
}
