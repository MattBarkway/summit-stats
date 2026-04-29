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
      <div className="flex-1 min-w-0 rounded-xl bg-white/40 backdrop-blur-sm border border-white/40 px-3 py-2">
        <p className="font-mono text-xs sm:text-sm text-gray-800 truncate">
          {url || "…"}
        </p>
      </div>
      <button
        type="button"
        onClick={copy}
        disabled={!url}
        className="inline-flex items-center gap-1.5 rounded-lg bg-white/50 hover:bg-white/70 px-3 py-2 text-sm font-medium text-gray-700 transition-colors disabled:opacity-50"
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copied" : "Copy"}
      </button>
      {canShare && (
        <button
          type="button"
          onClick={share}
          disabled={!url}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#3e7f6b]/80 hover:bg-[#358d73] px-3 py-2 text-sm font-medium text-white transition-colors disabled:opacity-50"
        >
          <Share2 size={14} />
          Share
        </button>
      )}
    </div>
  );
}
