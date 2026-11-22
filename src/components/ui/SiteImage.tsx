import Image, { type ImageProps } from "next/image";
import { withBasePath } from "@/lib/utils";

/**
 * next/image for the static export. `images.unoptimized` is set in next.config.mjs, so files in /public are served as-is.
 */
export default function SiteImage(props: ImageProps) {
  const src = typeof props.src === "string" ? withBasePath(props.src) : props.src;
  // eslint-disable-next-line jsx-a11y/alt-text -- alt is required by ImageProps and is passed through in `props`
  return <Image {...props} src={src} />;
}
