import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen } from 'lucide-react';
import { Cover } from '../../../components/Cover';
import { navigate } from '../../../utils/nav';
import type { FeaturedStory } from '../featuredStories';

const AUTO_ADVANCE_MS = 6000;
const INTERACTION_PAUSE_MS = 10000;
const SWIPE_THRESHOLD_PX = 45;

function useReducedMotion() {
  const [reduced, setReduced] = useState(() =>
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return reduced;
}

/** A clean, illustration-free welcome card appears when no published stories exist. */
function DefaultHero() {
  return (
    <section className="v66-hero v66-hero-default v67-hero-card" aria-label="Selamat datang di KataKecil">

      <div className="v66-hero-copy v67-welcome-copy">
        <span className="v66-hero-kicker">TEMPAT CERITA BERMULA</span>
        <h1>Cerita yang Tinggal Lebih Lama</h1>
        <p>
          Temukan kisah yang menemani harimu, dalam kata-kata yang selalu punya
          tempat untuk kembali.
        </p>
        <button
          type="button"
          className="v66-hero-action"
          onClick={() => navigate('/cerita')}
        >
          Jelajahi Perpustakaan <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}

export default function FeaturedHeroCarousel({ stories }: { stories: FeaturedStory[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  // Cloned edge slides make last → first and first → last transitions seamless.
  const [trackPosition, setTrackPosition] = useState(stories.length > 1 ? 1 : 0);
  const [skipTransition, setSkipTransition] = useState(false);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [visible, setVisible] = useState(() =>
    typeof document === 'undefined' || !document.hidden,
  );
  const reducedMotion = useReducedMotion();
  const pauseTimer = useRef<number | null>(null);
  const resetFrame = useRef<number | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const storyIds = stories.map(story => story.book.id).join('|');

  useEffect(() => {
    setActiveIndex(0);
    setTrackPosition(stories.length > 1 ? 1 : 0);
    setSkipTransition(false);
  }, [storyIds, stories.length]);

  useEffect(() => {
    const updateVisibility = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => document.removeEventListener('visibilitychange', updateVisibility);
  }, []);

  useEffect(() => () => {
    if (pauseTimer.current !== null) window.clearTimeout(pauseTimer.current);
    if (resetFrame.current !== null) window.cancelAnimationFrame(resetFrame.current);
  }, []);

  useEffect(() => {
    if (stories.length < 2 || reducedMotion || paused || hovering || !visible) return;
    const timer = window.setTimeout(() => {
      const next = (activeIndex + 1) % stories.length;
      setActiveIndex(next);
      setTrackPosition(next === 0 ? stories.length + 1 : next + 1);
    }, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [activeIndex, stories.length, reducedMotion, paused, hovering, visible]);

  const pauseForInteraction = () => {
    setPaused(true);
    if (pauseTimer.current !== null) window.clearTimeout(pauseTimer.current);
    pauseTimer.current = window.setTimeout(() => setPaused(false), INTERACTION_PAUSE_MS);
  };

  const selectSlide = (index: number) => {
    pauseForInteraction();
    const next = (index + stories.length) % stories.length;
    const forwardWrap = activeIndex === stories.length - 1 && next === 0;
    const backwardWrap = activeIndex === 0 && next === stories.length - 1;
    setActiveIndex(next);
    setTrackPosition(forwardWrap ? stories.length + 1 : backwardWrap ? 0 : next + 1);
  };

  const onTouchStart = (event: React.TouchEvent) => {
    const touch = event.changedTouches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const onTouchEnd = (event: React.TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start || stories.length < 2) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    // Do not hijack the reader's gestures or normal vertical page scrolling.
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
    selectSlide(activeIndex + (deltaX < 0 ? 1 : -1));
  };

  if (!stories.length) return <DefaultHero />;

  const current = stories[Math.min(activeIndex, stories.length - 1)];
  const trackStories = stories.length > 1
    ? [stories[stories.length - 1], ...stories, stories[0]]
    : stories;
  const { book, chapterCount } = current;

  return (
    <section
      className="v66-hero v66-hero-carousel v67-hero-card"
      role="region"
      aria-roledescription="carousel"
      aria-label="Cerita terbaru di KataKecil"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocusCapture={pauseForInteraction}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => { touchStart.current = null; }}
      onKeyDown={event => {
        if (stories.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault();
        selectSlide(activeIndex + (event.key === 'ArrowRight' ? 1 : -1));
      }}
    >
      <div className="v67-hero-layout">
      <div className="v66-hero-media" aria-label="Sampul cerita unggulan">
        <div
          className={`v66-hero-track ${skipTransition ? 'is-resetting' : ''}`}
          style={{ transform: `translate3d(-${trackPosition * 100}%, 0, 0)` }}
          onTransitionEnd={event => {
            if (event.target !== event.currentTarget || event.propertyName !== 'transform') return;
            if (trackPosition !== 0 && trackPosition !== stories.length + 1) return;
            setSkipTransition(true);
            setTrackPosition(trackPosition === 0 ? stories.length : 1);
            resetFrame.current = window.requestAnimationFrame(() => {
              resetFrame.current = window.requestAnimationFrame(() => setSkipTransition(false));
            });
          }}
        >
          {trackStories.map((story, index) => (
            <div className="v66-hero-art" key={`${story.book.id}-${index}`}>
              <Cover book={story.book} eager={stories.length === 1 || index === 1}/>
            </div>
          ))}
        </div>
      </div>
      <div className="v66-hero-copy" key={book.id}>
        <span className="v66-hero-kicker">✦ &nbsp; TERBARU DI KATAKECIL</span>
        <div className="v66-hero-meta">
          <span>{book.genre || 'Fiksi'}</span>
          <span><BookOpen size={13} aria-hidden="true" /> {chapterCount} bab tersedia</span>
        </div>
        <h1 className={book.title.length > 37 ? 'is-long-title' : undefined}>
          {book.title}
        </h1>
        <p>{book.synopsis || 'Sebuah cerita baru menantimu di KataKecil.'}</p>
        <button
          type="button"
          className="v66-hero-action"
          aria-label={`Mulai membaca ${book.title}`}
          onClick={() => navigate(`/baca/${book.slug}`)}
        >
          Mulai Membaca <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
      </div>
      {stories.length > 1 && (
        <div className="v66-hero-navigation">
          <nav className="v66-hero-pagination" aria-label="Pilih cerita unggulan">
            <span className="v66-slide-counter" aria-hidden="true">
              {String(activeIndex + 1).padStart(2, '0')} / {String(stories.length).padStart(2, '0')}
            </span>
            <div className="v66-slide-dots">
              {stories.map((story, index) => (
                <button
                  key={story.book.id}
                  type="button"
                  className={index === activeIndex ? 'is-active' : ''}
                  aria-label={`Tampilkan ${story.book.title}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                  onClick={() => selectSlide(index)}
                >
                  <span aria-hidden="true" />
                </button>
              ))}
            </div>
          </nav>
          <div className="v66-hero-arrows">
            <button
              type="button"
              aria-label="Cerita sebelumnya"
              onClick={() => selectSlide(activeIndex - 1)}
            >
              <ArrowLeft size={17} aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-label="Cerita berikutnya"
              onClick={() => selectSlide(activeIndex + 1)}
            >
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
