// Minimal JSX typing for the <model-viewer> web component (loaded via CDN
// script in index.html — see spec section 12). We only type the attributes
// this app actually uses.
import type React from "react";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          src?: string;
          alt?: string;
          poster?: string;
          ar?: boolean;
          "ar-modes"?: string;
          "ar-scale"?: string;
          "ios-src"?: string;
          "camera-controls"?: boolean;
          "auto-rotate"?: boolean;
          "shadow-intensity"?: string;
          exposure?: string;
          loading?: "auto" | "lazy" | "eager";
          reveal?: "auto" | "interaction" | "manual";
          "environment-image"?: string;
        },
        HTMLElement
      >;
    }
  }
}
export {};
