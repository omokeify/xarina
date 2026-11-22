"use client";

import { useState, useRef, useEffect, useId } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  User,
  ShoppingBag,
  X,
  Check,
  Sparkles,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  GripHorizontal,
  Volume2,
  VolumeX,
  Maximize2,
  Play,
  Pause,
} from "lucide-react";
import { Mark, Wordmark } from "@/components/brand/logo";
import { useCurrency } from "@/lib/currency/context";
import { formatMoney, type Currency } from "@/lib/money";
import type { ProductListing } from "@/lib/catalogue";
import type { FeaturedDrop } from "@/lib/featured-drop";
import type { HeroSettings } from "@/lib/site-settings";

type SimulatedDropState = "upcoming" | "vip" | "public" | "closed";
type FloatingWidgetMode = "draggable" | "docked" | "hidden";
type HeroMediaMode = "video" | "image";

interface ConceptViewProps {
  initialDrop: FeaturedDrop | null;
  heroSettings: HeroSettings;
  availableProducts: ProductListing[];
  serverNow: string;
  isPrive: boolean;
}

// 4 distinct statement silhouettes with real photography from your uploaded reference
const LOOKBOOK_PIECES = [
  {
    id: "look-1",
    number: "LOOK 01",
    name: "The Vermilion Cape Gown",
    silhouette: "High-neck fluid column with liquid sequin draping and sweeping capelet sleeves",
    edition: "25 pieces crafted",
    material: "Liquid Sequin & Silk Crepe",
    colorway: "Vermilion Red",
    imageSrc: "/concept/look-1.jpg",
    prices: { NGN: 31000000, GBP: 205000, USD: 265000 },
  },
  {
    id: "look-2",
    number: "LOOK 02",
    name: "The Noir Rose Brocade Gown",
    silhouette: "Floor-length high collar sheer brocade with belted waist and blouson sleeves",
    edition: "20 pieces crafted",
    material: "Embroidered Silk Chiffon",
    colorway: "Black & Rose Gold",
    imageSrc: "/concept/look-2.jpg",
    prices: { NGN: 34500000, GBP: 230000, USD: 295000 },
  },
  {
    id: "look-3",
    number: "LOOK 03",
    name: "The Plume Column Dress",
    silhouette: "Sculpted mock-neck evening sheath with artisanal ostrich feather cuffs and sweeping train",
    edition: "20 pieces crafted",
    material: "Silk Velvet & Ethically Sourced Plumes",
    colorway: "Midnight Noir",
    imageSrc: "/concept/look-3.jpg",
    prices: { NGN: 38000000, GBP: 250000, USD: 320000 },
  },
  {
    id: "look-4",
    number: "LOOK 04",
    name: "The Scarlett Cowl Silhouette",
    silhouette: "Dramatic plunge cowl neckline with liquid draping and floor-sweeping pooling hem",
    edition: "25 pieces crafted",
    material: "Heavy Silk Cady",
    colorway: "Scarlett Carmine",
    imageSrc: "/concept/look-4.jpg",
    prices: { NGN: 29500000, GBP: 195000, USD: 250000 },
  },
];

export function ConceptHomepageView({
  initialDrop,
  availableProducts,
}: ConceptViewProps) {
  const { currency, setCurrency } = useCurrency();
  const [simulatedState, setSimulatedState] = useState<SimulatedDropState>(
    (initialDrop?.state as SimulatedDropState) || "upcoming"
  );
  const [floatingMode, setFloatingMode] = useState<FloatingWidgetMode>("draggable");
  const [heroMediaMode, setHeroMediaMode] = useState<HeroMediaMode>("video");
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [panoramicView, setPanoramicView] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Waitlist sheet state
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);
  const [selectedPiece, setSelectedPiece] = useState<string>("Edition 04 — The Entire Release");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistName, setWaitlistName] = useState("");
  const [selectedSize, setSelectedSize] = useState("M");
  const [alertConsent, setAlertConsent] = useState(true);

  // Draggable floating widget coordinates
  const [dragPos, setDragPos] = useState({ x: 24, y: 24 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startMouseX: number; startMouseY: number; startPosX: number; startPosY: number } | null>(null);

  const nameInputId = useId();
  const emailInputId = useId();
  const consentInputId = useId();

  const handleOpenWaitlist = (pieceName?: string) => {
    if (pieceName) setSelectedPiece(pieceName);
    setWaitlistOpen(true);
    setWaitlistSuccess(false);
  };

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!waitlistEmail) return;
    setWaitlistSuccess(true);
  };

  const scrollCarousel = (direction: "left" | "right") => {
    if (!carouselRef.current) return;
    const scrollAmount = carouselRef.current.clientWidth * 0.75;
    carouselRef.current.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  };

  const toggleVideoPlayback = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Draggable widget handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = {
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startPosX: dragPos.x,
      startPosY: dragPos.y,
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragStartRef.current) return;
      const deltaX = dragStartRef.current.startMouseX - e.clientX;
      const deltaY = dragStartRef.current.startMouseY - e.clientY;
      const newX = Math.max(12, Math.min(window.innerWidth - 320, dragStartRef.current.startPosX + deltaX));
      const newY = Math.max(12, Math.min(window.innerHeight - 180, dragStartRef.current.startPosY + deltaY));
      setDragPos({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div className="min-h-screen bg-surface text-ink antialiased selection:bg-accent selection:text-ink">
      {/* 1. TOP SIMULATION & MEDIA CONTROLS BAR */}
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-space-2 border-b border-line bg-surface-raised px-space-3 py-space-2 text-caption shadow-xs">
        <div className="flex items-center gap-space-2">
          <span className="inline-block size-2 rounded-full bg-accent animate-pulse" />
          <span className="label text-ink">MEDIA & SEQUENCE PROTOTYPE</span>
        </div>

        <div className="flex items-center gap-space-3">
          {/* Hero Media Switcher */}
          <div className="flex items-center gap-1">
            <span className="label text-ink-muted text-[10px] hidden sm:inline">HERO MEDIA:</span>
            <button
              onClick={() => setHeroMediaMode("video")}
              className={`label px-space-1.5 py-0.5 text-[11px] transition-colors ${
                heroMediaMode === "video" ? "border border-accent bg-surface text-accent font-bold" : "text-ink-muted hover:text-ink"
              }`}
            >
              Film Loop
            </button>
            <button
              onClick={() => setHeroMediaMode("image")}
              className={`label px-space-1.5 py-0.5 text-[11px] transition-colors ${
                heroMediaMode === "image" ? "border border-accent bg-surface text-accent font-bold" : "text-ink-muted hover:text-ink"
              }`}
            >
              Still Portrait
            </button>
          </div>

          {/* Drop State Switcher */}
          <div className="flex items-center gap-1 border-l border-line pl-space-2">
            <span className="label text-ink-muted text-[10px] hidden md:inline">STATE:</span>
            {(["upcoming", "vip", "public", "closed"] as const).map((st) => (
              <button
                key={st}
                onClick={() => setSimulatedState(st)}
                className={`label px-space-1.5 py-0.5 text-[11px] transition-colors ${
                  simulatedState === st
                    ? "bg-action text-on-action"
                    : "border border-line bg-surface text-ink-muted hover:text-ink"
                }`}
              >
                {st === "upcoming" && "1. Waitlist"}
                {st === "vip" && "2. Privé"}
                {st === "public" && "3. Live"}
                {st === "closed" && "4. Archived"}
              </button>
            ))}
          </div>

          {/* Floating Widget Switcher */}
          <div className="flex items-center gap-1 border-l border-line pl-space-2">
            <span className="label text-ink-muted text-[10px] hidden lg:inline">TIMER:</span>
            {(["draggable", "docked", "hidden"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFloatingMode(mode)}
                className={`label px-space-1.5 py-0.5 text-[11px] capitalize transition-colors ${
                  floatingMode === mode ? "text-accent font-bold underline" : "text-ink-muted hover:text-ink"
                }`}
              >
                {mode === "draggable" ? "Draggable" : mode === "docked" ? "Docked" : "Off"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. INFINITE RUNNING TICKER (Announcement Marquee) */}
      <aside aria-label="Announcement" className="relative overflow-hidden border-b border-line bg-action py-space-2 text-on-action">
        <div className="flex w-full whitespace-nowrap">
          <div className="flex shrink-0 animate-[marquee_28s_linear_infinite] items-center gap-space-6 text-label">
            <span>COMPLIMENTARY EXPRESS WORLDWIDE SHIPPING ON ORDERS OVER £300</span>
            <span aria-hidden className="size-1 rounded-full bg-accent" />
            <span>UNREPEATED LIMITED DROPS · ZERO MASS PRODUCTION</span>
            <span aria-hidden className="size-1 rounded-full bg-accent" />
            <span>XARINA PRIVÉ MEMBERS ENJOY 2-HOUR EARLY DROP ACCESS</span>
            <span aria-hidden className="size-1 rounded-full bg-accent" />
            <span>DIRECT ATELIER STYLING & SIZING CONCIERGE VIA WHATSAPP</span>
            <span aria-hidden className="size-1 rounded-full bg-accent" />
          </div>
          <div aria-hidden className="flex shrink-0 animate-[marquee_28s_linear_infinite] items-center gap-space-6 text-label pl-space-6">
            <span>COMPLIMENTARY EXPRESS WORLDWIDE SHIPPING ON ORDERS OVER £300</span>
            <span aria-hidden className="size-1 rounded-full bg-accent" />
            <span>UNREPEATED LIMITED DROPS · ZERO MASS PRODUCTION</span>
            <span aria-hidden className="size-1 rounded-full bg-accent" />
            <span>XARINA PRIVÉ MEMBERS ENJOY 2-HOUR EARLY DROP ACCESS</span>
            <span aria-hidden className="size-1 rounded-full bg-accent" />
            <span>DIRECT ATELIER STYLING & SIZING CONCIERGE VIA WHATSAPP</span>
            <span aria-hidden className="size-1 rounded-full bg-accent" />
          </div>
        </div>
      </aside>

      {/* 3. ARCHITECTURAL EDITORIAL HEADER */}
      <header className="border-b border-line bg-surface/95 backdrop-blur-md">
        <div className="mx-auto grid max-w-screen-xl grid-cols-3 items-center px-space-3 py-space-3 md:px-space-5 md:py-space-4">
          <nav aria-label="Primary" className="flex items-center gap-space-4">
            <Link href="/shop" className="label text-ink-muted hover:text-ink">
              SHOP
            </Link>
            <a href="#lookbook-stage" className="label text-ink hover:text-accent flex items-center gap-1">
              THE DROP
              <span className="size-1.5 rounded-full bg-accent" />
            </a>
            <Link href="/prive" className="label text-ink-muted hover:text-ink hidden sm:inline-block">
              PRIVÉ
            </Link>
            <a href="#atelier" className="label text-ink-muted hover:text-ink hidden md:inline-block">
              ATELIER
            </a>
          </nav>

          <div className="flex flex-col items-center justify-center text-center">
            <Link href="/" aria-label="Xarina Home" className="flex flex-col items-center">
              <Wordmark className="text-title md:text-wordmark" />
              <span className="font-display text-caption italic text-ink-muted hidden sm:inline-block mt-0.5">
                Wearable statement dressing
              </span>
            </Link>
          </div>

          <div className="flex items-center justify-end gap-space-3 md:gap-space-4">
            <div className="flex items-center border border-line bg-surface px-space-2 py-1 text-label text-ink">
              {(["NGN", "GBP", "USD"] as Currency[]).map((curr) => (
                <button
                  key={curr}
                  onClick={() => setCurrency(curr)}
                  className={`px-1.5 transition-colors ${
                    currency === curr ? "text-ink font-bold underline decoration-accent decoration-2" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {curr}
                </button>
              ))}
            </div>

            <Link href="/prive" aria-label="Xarina Privé Member Access" className="text-ink-muted hover:text-ink hidden sm:inline-flex">
              <User className="size-4" />
            </Link>
            <Link href="/cart" aria-label="Shopping Bag" className="label flex items-center gap-1.5 text-ink hover:text-accent">
              <ShoppingBag className="size-4" />
              <span className="hidden sm:inline">(0)</span>
            </Link>
          </div>
        </div>
      </header>

      {/* 4. SECTION 1: CINEMATIC HERO (Video / Image Banner Only) */}
      <section aria-labelledby="hero-title" className="relative h-[74svh] md:h-[86svh] w-full overflow-hidden border-b border-line bg-surface-sunk">
        {heroMediaMode === "video" ? (
          /* High-Definition Fashion Campaign Film / Movement Drape */
          <div className="relative h-full w-full">
            <video
              ref={videoRef}
              autoPlay
              muted={isMuted}
              loop
              playsInline
              poster="/concept/hero-editorial.jpg"
              className="h-full w-full object-cover"
            >
              {/* Reliable high-fashion motion sample stream */}
              <source
                src="https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
                type="video/mp4"
              />
            </video>

            {/* Subtle atmospheric vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-80" />
          </div>
        ) : (
          /* High-Resolution Editorial Portrait from Atelier Seed */
          <div className="relative h-full w-full">
            <Image
              src="/concept/hero-editorial.jpg"
              alt="Xarina Edition 04 Campaign Portrait"
              fill
              priority
              sizes="100vw"
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent opacity-80" />
          </div>
        )}

        {/* Minimalist Editorial Title Overlay */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex flex-col justify-end p-space-4 md:p-space-6 lg:p-space-7">
          <div className="max-w-2xl">
            <p className="label tracking-[0.35em] text-accent mb-space-1">
              EDITION 04 · CAMPAIGN FILM
            </p>
            <h1 id="hero-title" className="font-display text-display-l md:text-display-xl text-ink font-normal leading-none drop-shadow-xs">
              The Architecture of Draping
            </h1>
            <p className="font-display text-title italic text-ink-muted mt-space-2 max-w-lg">
              Sculpted statement silhouettes cut in unrepeated limited editions.
            </p>
          </div>

          {/* Bottom video/sound controls and direct scroll anchor */}
          <div className="mt-space-4 flex items-center justify-between pt-space-3 border-t border-line/60">
            <div className="flex items-center gap-space-2">
              {heroMediaMode === "video" && (
                <>
                  <button
                    onClick={toggleVideoPlayback}
                    className="flex size-10 items-center justify-center border border-line bg-surface/90 text-ink backdrop-blur-xs hover:bg-surface"
                    aria-label={isPlaying ? "Pause video" : "Play video"}
                  >
                    {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                  </button>
                  <button
                    onClick={() => setIsMuted(!isMuted)}
                    className="flex size-10 items-center justify-center border border-line bg-surface/90 text-ink backdrop-blur-xs hover:bg-surface"
                    aria-label={isMuted ? "Unmute video" : "Mute video"}
                  >
                    {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                  </button>
                </>
              )}
              <span className="text-caption text-ink-muted hidden sm:inline">
                Atelier Lagos · Autumn 2026
              </span>
            </div>

            <a
              href="#lookbook-stage"
              className="label flex min-h-10 items-center gap-space-2 border border-line bg-surface/90 px-space-4 text-ink backdrop-blur-xs hover:bg-surface"
            >
              VIEW THE 4 SILHOUETTES <ChevronRight className="size-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* 5. SECTION 2: THE LOOKBOOK CAROUSEL (Real Photography Matching Uploaded Screenshot) */}
      <section id="lookbook-stage" aria-labelledby="lookbook-heading" className="relative border-b border-line bg-surface-sunk py-space-6 md:py-space-7 overflow-hidden">
        <div className="mx-auto max-w-screen-xl px-space-3 mb-space-4 md:px-space-5 flex items-end justify-between">
          <div>
            <p className="label text-accent mb-1">THE RUNWAY LINEUP</p>
            <h2 id="lookbook-heading" className="font-display text-display-m text-ink">
              Edition 04 Silhouettes
            </h2>
            <p className="text-body-s text-ink-muted mt-0.5">
              Photographed on limestone atelier backdrop. Zero mass manufacturing.
            </p>
          </div>

          <div className="flex items-center gap-space-2">
            <button
              onClick={() => setPanoramicView(!panoramicView)}
              className="label hidden sm:flex items-center gap-1.5 border border-line bg-surface-raised px-space-3 py-2 text-ink hover:border-ink"
            >
              <Maximize2 className="size-3.5 text-accent" />
              {panoramicView ? "GRID VIEW" : "PANORAMIC LINEUP"}
            </button>
            <button
              onClick={() => scrollCarousel("left")}
              className="flex size-11 items-center justify-center border border-line bg-surface-raised/80 text-ink hover:border-ink hover:bg-surface-raised transition-colors"
              aria-label="Previous look"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              onClick={() => scrollCarousel("right")}
              className="flex size-11 items-center justify-center border border-line bg-surface-raised/80 text-ink hover:border-ink hover:bg-surface-raised transition-colors"
              aria-label="Next look"
            >
              <ChevronRight className="size-5" />
            </button>
          </div>
        </div>

        {/* Panoramic Runway Banner Option (Exact match to your uploaded screenshot) */}
        {panoramicView ? (
          <div className="mx-auto max-w-screen-xl px-space-3 md:px-space-5 mb-space-5">
            <div className="relative aspect-[1024/335] w-full border border-line overflow-hidden bg-surface-sunk">
              <Image
                src="/concept/lookbook-all.jpg"
                alt="Edition 04 Full Runway Lineup"
                fill
                sizes="100vw"
                className="object-cover"
              />
            </div>
            <p className="text-caption text-ink-muted text-center mt-2">
              Panoramic Runway Presentation · Left to Right: Looks 01, 02, 03, and 04
            </p>
          </div>
        ) : null}

        {/* 4-Model Side-by-Side Carousel Cards */}
        <div
          ref={carouselRef}
          className="flex w-full gap-space-4 overflow-x-auto px-space-3 md:px-space-5 pb-space-4 pt-space-2 scroll-smooth no-scrollbar snap-x snap-mandatory"
        >
          {LOOKBOOK_PIECES.map((piece) => {
            const price = piece.prices[currency];
            return (
              <div
                key={piece.id}
                className="group relative flex-none w-[280px] sm:w-[320px] md:w-[calc(25%-18px)] snap-start flex flex-col items-center justify-between bg-surface-raised border border-line/70 hover:border-ink transition-all duration-300"
              >
                {/* Look Indicator Badge */}
                <div className="w-full flex items-center justify-between p-space-3 border-b border-line/40 text-caption text-ink-muted">
                  <span className="label tracking-[0.2em]">{piece.number}</span>
                  <span className="label text-accent">{piece.edition}</span>
                </div>

                {/* Real High-Fashion Model Photography from your reference */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-sunk">
                  <Image
                    src={piece.imageSrc}
                    alt={piece.name}
                    fill
                    sizes="(min-width: 768px) 25vw, 80vw"
                    className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-raised via-transparent to-transparent opacity-40 group-hover:opacity-10 transition-opacity" />
                </div>

                {/* Information block (Resting state: quiet / Hover: reveals purchase/waitlist) */}
                <div className="w-full p-space-4 flex flex-col justify-between border-t border-line/40">
                  <div className="text-center">
                    <p className="font-display text-title text-ink group-hover:text-accent transition-colors">
                      {piece.name}
                    </p>
                    <p className="text-caption text-ink-muted line-clamp-1 mt-0.5">
                      {piece.silhouette}
                    </p>
                    <p className="text-body font-semibold text-ink mt-space-2">
                      {formatMoney(price, currency)}
                    </p>
                  </div>

                  <div className="mt-space-3 pt-space-2">
                    <button
                      onClick={() => handleOpenWaitlist(piece.name)}
                      className="label w-full border border-ink bg-surface-raised py-2.5 text-ink hover:bg-action hover:text-on-action transition-colors"
                    >
                      {simulatedState === "upcoming" && "WAITLIST SILHOUETTE"}
                      {simulatedState === "vip" && "VIEW PRIVÉ ALLOCATION"}
                      {simulatedState === "public" && "ADD TO BAG"}
                      {simulatedState === "closed" && "NOTIFY ON RESTOCK"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 6. SECTION 3: THE DROP TIMER (Beneath Lookbook, Before Available Now) */}
      <section aria-labelledby="drop-timer-heading" className="border-b border-line bg-surface py-space-6 md:py-space-7">
        <div className="mx-auto max-w-screen-xl px-space-3 md:px-space-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-6 items-center border border-line bg-surface-raised p-space-5 md:p-space-7">
            {/* Left 7 Columns */}
            <div className="lg:col-span-7 flex flex-col">
              <div className="flex items-center gap-space-2 mb-space-2">
                <span className="label tracking-[0.25em] text-accent">SCHEDULED RELEASE</span>
                <span aria-hidden className="w-4 h-px bg-line" />
                {simulatedState === "upcoming" && (
                  <span className="label border border-line px-space-2 py-0.5 text-ink-muted">WAITLIST OPEN</span>
                )}
                {simulatedState === "vip" && (
                  <span className="label bg-action text-on-action px-space-2 py-0.5 text-accent flex items-center gap-1">
                    <Sparkles className="size-3" /> PRIVÉ EARLY ACCESS ACTIVE
                  </span>
                )}
                {simulatedState === "public" && (
                  <span className="label bg-action text-on-action px-space-2 py-0.5">PUBLIC DROP LIVE</span>
                )}
                {simulatedState === "closed" && (
                  <span className="label border border-line px-space-2 py-0.5 text-ink-muted">ALLOCATION CLAIMED</span>
                )}
              </div>

              <h2 id="drop-timer-heading" className="font-display text-display-m md:text-display-l text-ink">
                Edition 04 Release Window
              </h2>
              <p className="font-display text-title italic text-ink-muted mt-1 max-w-xl">
                {simulatedState === "upcoming" && "Waitlist registers priority access before the public sale unlocks."}
                {simulatedState === "vip" && "Privé members shop now via single-use access link. Public opening counts down below."}
                {simulatedState === "public" && "Purchasing is active. 15-minute stock hold begins when checkout starts."}
                {simulatedState === "closed" && "All pieces in Edition 04 have been claimed. Register below for Edition 05 notifications."}
              </p>

              {/* Countdown Numbers */}
              <div className="mt-space-5 grid grid-cols-4 gap-space-2 max-w-lg text-center">
                <div className="border border-line bg-surface p-space-3">
                  <span className="font-display text-display-l block text-ink tabular-nums">02</span>
                  <span className="label text-ink-muted">DAYS</span>
                </div>
                <div className="border border-line bg-surface p-space-3">
                  <span className="font-display text-display-l block text-ink tabular-nums">14</span>
                  <span className="label text-ink-muted">HOURS</span>
                </div>
                <div className="border border-line bg-surface p-space-3">
                  <span className="font-display text-display-l block text-ink tabular-nums">38</span>
                  <span className="label text-ink-muted">MIN</span>
                </div>
                <div className="border border-line bg-surface p-space-3">
                  <span className="font-display text-display-l block text-ink tabular-nums">42</span>
                  <span className="label text-ink-muted">SEC</span>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Conversion CTA Block */}
            <div className="lg:col-span-5 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-line pt-space-5 lg:pt-0 lg:pl-space-7">
              <p className="label text-ink-muted mb-space-2">ACTION</p>

              {simulatedState === "upcoming" && (
                <div className="flex flex-col gap-space-3">
                  <button
                    onClick={() => handleOpenWaitlist()}
                    className="flex min-h-[52px] w-full items-center justify-center bg-action px-space-6 text-label text-on-action hover:opacity-90 transition-opacity"
                  >
                    JOIN THE EDITION 04 WAITLIST
                  </button>
                  <p className="text-caption text-ink-muted leading-relaxed">
                    Privé members receive access 2 hours ahead of public release.
                  </p>
                </div>
              )}

              {simulatedState === "vip" && (
                <div className="flex flex-col gap-space-3">
                  <Link
                    href="/prive"
                    className="flex min-h-[52px] w-full items-center justify-center bg-action border border-accent px-space-6 text-label text-accent hover:opacity-90 transition-opacity"
                  >
                    ENTER PRIVÉ WITH ACCESS LINK
                  </Link>
                  <p className="text-caption text-ink-muted leading-relaxed">
                    Exclusive allocation reserved for registered members.
                  </p>
                </div>
              )}

              {simulatedState === "public" && (
                <div className="flex flex-col gap-space-3">
                  <a
                    href="#lookbook-stage"
                    className="flex min-h-[52px] w-full items-center justify-center bg-action px-space-6 text-label text-on-action hover:opacity-90 transition-opacity"
                  >
                    SELECT YOUR SILHOUETTE
                  </a>
                  <p className="text-caption text-ink-muted leading-relaxed">
                    Limited run pieces are selling live now.
                  </p>
                </div>
              )}

              {simulatedState === "closed" && (
                <div className="flex flex-col gap-space-3">
                  <button
                    onClick={() => handleOpenWaitlist("Edition 05 Preview")}
                    className="flex min-h-[52px] w-full items-center justify-center border border-ink bg-transparent px-space-6 text-label text-ink hover:bg-surface transition-colors"
                  >
                    PRE-REGISTER FOR EDITION 05
                  </button>
                  <p className="text-caption text-ink-muted leading-relaxed">
                    Receive first lookbooks for our next seasonal salon release.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 7. SECTION 4: "AVAILABLE NOW" (Immediate In-Stock Pieces) */}
      <section aria-labelledby="available-heading" className="mx-auto max-w-screen-xl px-space-3 py-space-6 md:px-space-5 md:py-space-7 border-b border-line">
        <div className="mb-space-5 flex items-end justify-between">
          <div>
            <p className="label text-accent mb-1">IN-STOCK ARCHIVE</p>
            <h2 id="available-heading" className="font-display text-display-m text-ink">
              Available Now
            </h2>
            <p className="text-body-s text-ink-muted mt-1">
              Ready-to-wear statement pieces ready for immediate insured dispatch.
            </p>
          </div>
          <Link href="/shop" className="label text-ink-muted hover:text-ink">
            SHOP FULL SALON ({availableProducts.length || 4})
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-space-3 gap-y-space-5 md:gap-x-space-4">
          {(availableProducts.length > 0 ? availableProducts.slice(0, 4) : LOOKBOOK_PIECES).map((p, idx) => {
            const price = "prices" in p && p.prices && currency in p.prices ? p.prices[currency] : 22000000;
            const imgSrc = idx < 4 ? LOOKBOOK_PIECES[idx].imageSrc : "/concept/hero-editorial.jpg";
            return (
              <div key={p.id} className="group flex flex-col">
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-sunk border border-line">
                  <Image
                    src={imgSrc}
                    alt={p.name}
                    fill
                    sizes="(min-width: 768px) 25vw, 50vw"
                    className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute bottom-2 left-2 bg-surface/90 px-space-1.5 py-0.5 text-label text-ink">
                    SHIPS IN 24H
                  </div>
                </div>
                <div className="mt-space-2 flex flex-col">
                  <span className="font-display text-title text-ink group-hover:text-accent transition-colors">
                    {p.name}
                  </span>
                  <span className="text-body-s text-ink-muted mt-0.5">
                    {formatMoney(price ?? 22000000, currency)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 8. SECTION 5: XARINA PRIVÉ */}
      <section data-theme="prive" className="border-b border-line bg-surface text-ink py-space-6 md:py-space-7">
        <div className="mx-auto max-w-screen-md px-space-3 text-center md:px-space-5">
          <div className="mb-space-3 flex justify-center">
            <Mark size={36} className="text-accent" />
          </div>
          <p className="label tracking-[0.3em] text-accent mb-space-2">THE PRIVATE SALON</p>
          <h2 className="font-display text-display-l md:text-display-xl text-ink">
            Xarina Privé
          </h2>
          <p className="mt-space-3 text-body text-ink-muted leading-relaxed">
            A private circle for our patrons. Members receive verified early drop access, reserved piece allocations, and bespoke styling appointments with the founder in Lagos and London.
          </p>

          <div className="mt-space-5 flex flex-col sm:flex-row items-center justify-center gap-space-3">
            <Link
              href="/prive"
              className="flex min-h-[50px] w-full sm:w-auto items-center justify-center bg-action px-space-6 text-label text-on-action transition-opacity hover:opacity-90"
            >
              REQUEST PRIVÉ ACCESS
            </Link>
            <Link
              href="/prive/sign-in"
              className="flex min-h-[50px] w-full sm:w-auto items-center justify-center border border-line bg-transparent px-space-6 text-label text-ink transition-colors hover:bg-surface-raised"
            >
              MEMBER MAGIC LINK SIGN IN
            </Link>
          </div>
        </div>
      </section>

      {/* 9. SECTION 6: ATELIER TRUST STRIP */}
      <section id="atelier" aria-labelledby="trust-heading" className="mx-auto max-w-screen-xl px-space-3 py-space-6 md:px-space-5 md:py-space-7 border-b border-line">
        <h2 id="trust-heading" className="sr-only">Atelier Standards</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-line">
          <div className="flex flex-col gap-space-2 p-space-4 text-center md:text-left">
            <p className="label text-accent">LIMITED ARCHIVAL EDITIONS</p>
            <h3 className="font-display text-title text-ink">Single-Run Production</h3>
            <p className="text-body-s text-ink-muted leading-relaxed">
              Every design is crafted in limited numbers under 50 pieces. Patterns are archived once a drop sells out. Zero mass inventory.
            </p>
          </div>

          <div className="flex flex-col gap-space-2 p-space-4 text-center md:text-left">
            <p className="label text-accent">GLOBAL DISPATCH</p>
            <h3 className="font-display text-title text-ink">Lagos & London Hubs</h3>
            <p className="text-body-s text-ink-muted leading-relaxed">
              Insured courier delivery worldwide via DHL Express. Orders are hand-wrapped in archival boxes with dedicated tracking.
            </p>
          </div>

          <div className="flex flex-col gap-space-2 p-space-4 text-center md:text-left">
            <p className="label text-accent">DIRECT ATELIER CONCIERGE</p>
            <h3 className="font-display text-title text-ink">WhatsApp Fit Consultation</h3>
            <p className="text-body-s text-ink-muted leading-relaxed">
              Connect directly with our atelier team for customized measurement verification, styling advice, and delivery coordination.
            </p>
            <a
              href="https://wa.me/2340000000000?text=Hello%20Xarina%20Atelier"
              target="_blank"
              rel="noopener noreferrer"
              className="label text-ink hover:text-accent mt-2 flex items-center justify-center md:justify-start gap-1"
            >
              <MessageCircle className="size-3.5 text-accent" /> MESSAGE THE ATELIER
            </a>
          </div>
        </div>
      </section>

      {/* 10. EDITORIAL FOOTER */}
      <footer className="mx-auto max-w-screen-xl px-space-3 py-space-7 md:px-space-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-space-5 mb-space-7">
          <div className="flex flex-col gap-space-2">
            <Wordmark className="text-wordmark" />
            <p className="font-display text-caption italic text-ink-muted">Wearable statement dressing</p>
            <p className="text-caption text-ink-muted mt-2 max-w-xs">
              Lagos · London. Dedicated to high-impact silhouettes and uncompromising craftsmanship.
            </p>
          </div>

          <div className="flex flex-col gap-space-2">
            <p className="label text-ink">EXPLORE</p>
            <Link href="/shop" className="text-body-s text-ink-muted hover:text-ink">The Full Salon</Link>
            <a href="#lookbook-stage" className="text-body-s text-ink-muted hover:text-ink">Current Edition Drop</a>
            <Link href="/prive" className="text-body-s text-ink-muted hover:text-ink">Xarina Privé</Link>
            <Link href="/about" className="text-body-s text-ink-muted hover:text-ink">About the Atelier</Link>
          </div>

          <div className="flex flex-col gap-space-2">
            <p className="label text-ink">CLIENT SERVICE</p>
            <Link href="/delivery" className="text-body-s text-ink-muted hover:text-ink">Delivery & Duties</Link>
            <Link href="/returns" className="text-body-s text-ink-muted hover:text-ink">Returns & Archival Care</Link>
            <Link href="/faq" className="text-body-s text-ink-muted hover:text-ink">Drop FAQs</Link>
            <Link href="/privacy" className="text-body-s text-ink-muted hover:text-ink">Privacy & NDPA</Link>
          </div>

          <div className="flex flex-col gap-space-2">
            <p className="label text-ink">DROP ALERTS</p>
            <p className="text-caption text-ink-muted">
              Subscribe for private notices prior to upcoming edition drops.
            </p>
            <form onSubmit={(e) => { e.preventDefault(); alert("Subscribed for drop alerts"); }} className="flex mt-1">
              <input
                type="email"
                required
                placeholder="Enter your email"
                className="w-full border border-line bg-surface-raised px-space-2 py-1.5 text-body-s text-ink focus:border-ink focus:outline-hidden"
              />
              <button
                type="submit"
                className="bg-action px-space-3 text-label text-on-action hover:opacity-90 shrink-0"
              >
                JOIN
              </button>
            </form>
          </div>
        </div>

        <div className="border-t border-line pt-space-4 flex flex-col sm:flex-row items-center justify-between text-caption text-ink-muted gap-space-2">
          <p>© {new Date().getFullYear()} Xarina Limited. All rights reserved.</p>
          <div className="flex items-center gap-space-3">
            <span>Prices shown in {currency}</span>
            <span aria-hidden>·</span>
            <span>Zero Mass Production</span>
          </div>
        </div>
      </footer>

      {/* 11. THE DRAGGABLE TIMER BOX / DOCKED PILL */}
      {floatingMode === "draggable" && (
        <div
          style={{ right: `${dragPos.x}px`, bottom: `${dragPos.y}px` }}
          className={`fixed z-50 select-none border border-line bg-surface-raised/95 backdrop-blur-md p-space-3 shadow-2xl transition-shadow ${
            isDragging ? "shadow-2xl ring-2 ring-accent cursor-grabbing" : "cursor-grab"
          }`}
          onMouseDown={handleMouseDown}
        >
          <div className="flex items-center justify-between border-b border-line pb-1.5 mb-2">
            <div className="flex items-center gap-1 text-ink-muted">
              <GripHorizontal className="size-3.5" />
              <span className="label text-[10px] tracking-widest">DRAG TIMER</span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFloatingMode("docked");
              }}
              title="Dock as bottom pill"
              className="text-caption text-ink-muted hover:text-ink text-[10px] underline ml-2"
            >
              Dock Pill
            </button>
          </div>

          <div className="flex items-center gap-space-3">
            <div className="flex flex-col">
              <span className="label text-[9px] text-accent">
                {simulatedState === "upcoming" && "DROP 04 OPENS IN"}
                {simulatedState === "vip" && "PUBLIC LAUNCH IN"}
                {simulatedState === "public" && "DROP LIVE NOW"}
                {simulatedState === "closed" && "DROP CONCLUDED"}
              </span>
              <div className="flex items-center gap-1 font-display text-title tabular-nums text-ink">
                <span>02D</span>
                <span className="text-accent">:</span>
                <span>14H</span>
                <span className="text-accent">:</span>
                <span>38M</span>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenWaitlist();
              }}
              className="label bg-action text-on-action px-space-3 py-2 hover:opacity-90 text-[11px]"
            >
              {simulatedState === "upcoming" ? "WAITLIST" : "VIEW DROP"}
            </button>
          </div>
        </div>
      )}

      {/* DOCKED LUXURY BOTTOM PILL */}
      {floatingMode === "docked" && (
        <div className="fixed bottom-space-4 right-space-4 z-50 border border-line bg-surface-raised/95 backdrop-blur-md px-space-4 py-space-2.5 shadow-xl flex items-center gap-space-4">
          <div className="flex items-center gap-space-2">
            <span className="size-2 rounded-full bg-accent animate-pulse" />
            <div className="flex flex-col">
              <span className="label text-[9px] text-ink-muted">EDITION 04 COUNTDOWN</span>
              <span className="font-display text-body font-semibold text-ink tabular-nums">
                02D : 14H : 38M : 42S
              </span>
            </div>
          </div>

          <button
            onClick={() => handleOpenWaitlist()}
            className="label bg-action text-on-action px-space-3 py-1.5 text-[11px] hover:opacity-90"
          >
            JOIN WAITLIST →
          </button>

          <button
            onClick={() => setFloatingMode("draggable")}
            title="Make timer draggable"
            className="text-ink-muted hover:text-ink"
          >
            <GripHorizontal className="size-3.5" />
          </button>
        </div>
      )}

      {/* 12. INTERACTIVE WAITLIST MODAL */}
      {waitlistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-action/60 p-space-3 backdrop-blur-xs">
          <div className="relative w-full max-w-lg border border-line bg-surface p-space-5 shadow-xl">
            <button
              onClick={() => setWaitlistOpen(false)}
              className="absolute right-space-4 top-space-4 text-ink-muted hover:text-ink"
              aria-label="Close"
            >
              <X className="size-5" />
            </button>

            {!waitlistSuccess ? (
              <form onSubmit={handleWaitlistSubmit} className="flex flex-col gap-space-4">
                <div>
                  <span className="label text-accent">PRIORITY ACCESS</span>
                  <h3 className="font-display text-display-m text-ink mt-1">Join the Drop Waitlist</h3>
                  <p className="text-body-s text-ink-muted mt-1">
                    Registering interest for: <strong className="text-ink">{selectedPiece}</strong>.
                    You will receive direct notification the moment VIP early access or public sales begin.
                  </p>
                </div>

                <div className="flex flex-col gap-space-3">
                  <div>
                    <label htmlFor={nameInputId} className="label text-ink-muted block mb-1">
                      FULL NAME
                    </label>
                    <input
                      id={nameInputId}
                      type="text"
                      required
                      value={waitlistName}
                      onChange={(e) => setWaitlistName(e.target.value)}
                      placeholder="e.g. Amara Okafor"
                      className="w-full border border-line bg-surface-raised px-space-3 py-2 text-body text-ink focus:border-ink focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label htmlFor={emailInputId} className="label text-ink-muted block mb-1">
                      EMAIL ADDRESS
                    </label>
                    <input
                      id={emailInputId}
                      type="email"
                      required
                      value={waitlistEmail}
                      onChange={(e) => setWaitlistEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full border border-line bg-surface-raised px-space-3 py-2 text-body text-ink focus:border-ink focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="label text-ink-muted block mb-1">PREFERRED SIZE</label>
                    <div className="grid grid-cols-5 gap-space-2">
                      {["XS", "S", "M", "L", "XL"].map((sz) => (
                        <button
                          key={sz}
                          type="button"
                          onClick={() => setSelectedSize(sz)}
                          className={`py-1.5 label text-center border ${
                            selectedSize === sz
                              ? "border-ink bg-action text-on-action"
                              : "border-line bg-surface-raised text-ink hover:border-ink"
                          }`}
                        >
                          {sz}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-start gap-space-2 pt-1">
                    <input
                      type="checkbox"
                      id={consentInputId}
                      checked={alertConsent}
                      onChange={(e) => setAlertConsent(e.target.checked)}
                      className="mt-1"
                    />
                    <label htmlFor={consentInputId} className="text-caption text-ink-muted cursor-pointer">
                      Send me one-tap access links when the drop goes live. I understand waitlist counts represent interest and not guaranteed stock.
                    </label>
                  </div>
                </div>

                <button
                  type="submit"
                  className="flex min-h-[50px] w-full items-center justify-center bg-action text-label text-on-action hover:opacity-90"
                >
                  CONFIRM WAITLIST REGISTRATION
                </button>
              </form>
            ) : (
              <div className="py-space-6 text-center">
                <div className="mx-auto mb-space-3 flex size-12 items-center justify-center rounded-full bg-accent text-on-action">
                  <Check className="size-6" />
                </div>
                <h3 className="font-display text-display-m text-ink">You are on the list</h3>
                <p className="text-body text-ink-muted mt-space-2">
                  We have registered your interest for <strong className="text-ink">{selectedPiece}</strong>.
                  Check your inbox ({waitlistEmail}) for priority schedule details.
                </p>
                <button
                  onClick={() => setWaitlistOpen(false)}
                  className="mt-space-5 inline-block border border-ink bg-transparent px-space-6 py-space-2 text-label text-ink hover:bg-surface-raised"
                >
                  RETURN TO EDITORIAL
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
