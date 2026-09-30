import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Pill } from "../primitives/Pill";
import type { UseCase } from "../content/useCases";
import "./UseCaseFilm.css";

/** Campaign film with deferred media requests and an explicit motion control. */
export function UseCaseFilm({ item, href, priority = false }: { item: UseCase; href?: string; priority?: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [pageVisible, setPageVisible] = useState(true);
  const [choice, setChoice] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const play = visible && pageVisible && (choice ?? !reduced);
  const base = `/use-cases/${item.slug}/${item.slug}`;

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { setReduced(query.matches); setChoice(null); };
    update(); query.addEventListener("change", update);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.15 });
    if (frame.current) observer.observe(frame.current);
    const visibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    return () => { query.removeEventListener("change", update); observer.disconnect(); document.removeEventListener("visibilitychange", visibility); };
  }, []);

  useEffect(() => {
    const element = video.current;
    if (!element) return;
    if (play && !failed) {
      if (!loaded) element.load();
      void element.play().catch(() => setPlaying(false));
    } else element.pause();
  }, [play, loaded, failed]);

  const movie = <><img className="use-film__poster" src={`${base}-poster${href ? "-small" : ""}.jpg`} srcSet={href ? undefined : `${base}-poster-small.jpg 720w, ${base}-poster.jpg 1440w`} sizes={href ? "(max-width:680px) 100vw, (max-width:1100px) 50vw, 33vw" : "(max-width:900px) 100vw, 65vw"} width="1440" height="1080" loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} alt="" /><video ref={video} muted loop playsInline preload="none"
    aria-label={item.alt} onLoadedMetadata={() => setLoaded(true)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setFailed(true)}>
    {(loaded || play) && <><source src={`${base}${href ? "-preview" : ""}.webm`} type="video/webm" /><source src={`${base}${href ? "-preview" : ""}.mp4`} type="video/mp4" /></>}
  </video></>;

  return <figure className="use-film" ref={frame}>
    {href ? <Link to={href} aria-label={`See how: ${item.title}`}>{movie}</Link> : movie}
    <div className="use-film__controls">
      <span>Illustrative demo</span>
      <Pill variant="secondary" onClick={() => { setFailed(false); setChoice(!playing); }} aria-label={`${playing ? "Pause" : "Play"} ${item.title}`}>
        {playing ? "Pause" : failed ? "Replay" : "Play"}<span aria-hidden="true">{playing ? "Ⅱ" : "▷"}</span>
      </Pill>
    </div>
  </figure>;
}
