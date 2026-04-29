import Image from "next/image";

type Variant = "white" | "orange";

export default function PoweredByStrava({
  variant = "white",
  width = 120,
  className = "",
}: {
  variant?: Variant;
  width?: number;
  className?: string;
}) {
  const src =
    variant === "orange"
      ? "/strava/powered_by_strava_horiz_orange.svg"
      : "/strava/powered_by_strava_horiz_white.svg";

  const height = Math.round((width * 24) / 120);

  return (
    <Image
      src={src}
      alt="Powered by Strava"
      width={width}
      height={height}
      className={className}
    />
  );
}
