import { ViteReactSSG } from "vite-react-ssg";
// Foundation CSS must import BEFORE any component/page CSS so its `.container`,
// `.section`, etc. rules sit early in the cascade and can be overridden by
// per-component styles. Importing routes first would flip this order and
// break every page that composes with `.container` (see PR #16 postmortem).
import "./styles/tokens.css";
import "./styles/base.css";
import routes from "./App";

// vite-react-ssg discovers every route from `routes` + `getStaticPaths` and
// prerenders each one to its own dist/<route>/index.html at build time. In
// dev, the same routes power client-side navigation. react-helmet-async is
// managed internally by vite-react-ssg — do not wrap in <HelmetProvider>
// here or you'll get "Helmet: HelmetProvider is not defined" at build.
export const createRoot = ViteReactSSG({ routes });
