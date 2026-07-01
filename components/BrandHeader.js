import { useState } from "react";
import { colorForKey } from "../lib/colors";
import { getBrandAssets } from "../lib/brandAssets";

export default function BrandHeader({ brand, count }) {
  const { domain, heroImage } = getBrandAssets(brand);
  const [logoFailed, setLogoFailed] = useState(false);
  const base = colorForKey(brand);

  return (
    <div
      key={brand}
      className="animate-fade-slide-in relative overflow-hidden rounded-2xl mb-4 flex items-center justify-between gap-4 px-5 sm:px-6 py-5"
      style={{ background: `linear-gradient(120deg, ${base} 0%, ${shade(base, 28)} 100%)` }}
    >
      <div className="flex items-center gap-4 min-w-0">
        <div className="h-14 w-14 rounded-2xl bg-white/95 flex items-center justify-center shrink-0 shadow-lg overflow-hidden">
          {domain && !logoFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://logo.clearbit.com/${domain}?size=128`}
              alt={`${brand} logo`}
              className="h-9 w-9 object-contain"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span className="text-lg font-bold" style={{ color: base }}>
              {brand.slice(0, 2).toUpperCase()}
            </span>
          )}
        </div>
        <div className="min-w-0">
          <p className="text-white font-semibold text-lg sm:text-xl truncate">{brand}</p>
          <p className="text-white/80 text-xs sm:text-sm">
            {count} open task{count === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {heroImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={heroImage}
          alt=""
          className="hidden sm:block h-20 w-32 object-cover rounded-xl shadow-lg shrink-0"
        />
      )}
    </div>
  );
}

// Lightens/darkens a hex color by `amt` for a simple two-stop gradient.
function shade(hex, amt) {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, Math.max(0, (num >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xff) + amt));
  const b = Math.min(255, Math.max(0, (num & 0xff) + amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}
