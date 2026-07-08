import { ViteReactSSG } from "vite-react-ssg";
import routes from "./App";
import "./styles/tokens.css";
import "./styles/base.css";

// vite-react-ssg discovers every route from `routes` + `getStaticPaths` and
// prerenders each one to its own dist/<route>/index.html at build time. In
// dev, the same routes power client-side navigation. react-helmet-async is
// managed internally by vite-react-ssg — do not wrap in <HelmetProvider>
// here or you'll get "Helmet: HelmetProvider is not defined" at build.
export const createRoot = ViteReactSSG({ routes });
