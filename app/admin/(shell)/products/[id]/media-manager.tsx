"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { IMAGE_TYPES, MAX_IMAGE_BYTES, type AdminMedia } from "@/lib/admin/products";
import { cn } from "@/lib/utils";
import {
  createVideoUpload,
  deleteMedia,
  reorderMedia,
  updateMediaAlt,
  updateMediaDisplay,
  uploadImages,
  type ActionState,
} from "../actions";
import { FormStatus, cellInput } from "../_components/form-parts";

type Item = AdminMedia & { url: string | null };
type Pending = { key: string; file: File; preview: string; alt: string };

const initial: ActionState = { status: "idle" };
const ACCEPT = Object.keys(IMAGE_TYPES).join(",");

export function MediaManager({
  productId,
  media,
  muxReady,
}: {
  productId: string;
  media: Item[];
  muxReady: boolean;
}) {
  const router = useRouter();
  const [items, setItems] = useState(media);
  const [message, setMessage] = useState<ActionState>(initial);
  const [busy, startTransition] = useTransition();
  const [dragId, setDragId] = useState<string | null>(null);

  useEffect(() => setItems(media), [media]);

  function commitOrder(next: Item[]) {
    const previous = items;
    setItems(next);
    startTransition(async () => {
      const res = await reorderMedia(
        productId,
        next.map((m) => m.id),
      );
      if (res.status === "error") setItems(previous);
      setMessage(res.status === "error" ? res : { status: "saved", message: "Order saved." });
    });
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target]!, next[index]!];
    commitOrder(next);
  }

  function dropOn(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = items.findIndex((m) => m.id === dragId);
    const to = items.findIndex((m) => m.id === targetId);
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved!);
    setDragId(null);
    commitOrder(next);
  }

  function remove(item: Item) {
    if (!window.confirm(`Delete this ${item.type}? This can't be undone.`)) return;
    startTransition(async () => {
      const res = await deleteMedia(productId, item.id);
      setMessage(res.status === "error" ? res : { status: "saved", message: "Deleted." });
      if (res.status === "saved") router.refresh();
    });
  }

  function saveAlt(item: Item, alt: string) {
    if (alt.trim() === item.alt) return;
    startTransition(async () => {
      const res = await updateMediaAlt(productId, item.id, alt);
      setMessage(res.status === "error" ? res : { status: "saved", message: "Description saved." });
    });
  }

  return (
    <div className="gap-space-5 flex flex-col">
      {items.length === 0 ? (
        <p className="text-body-s text-ink-muted">
          No photos yet. The shop shows a plain placeholder until you add one.
        </p>
      ) : (
        <ol className="flex flex-col" aria-label="Gallery order">
          {items.map((item, i) => (
            <li
              key={item.id}
              draggable={!busy}
              onDragStart={() => setDragId(item.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => dropOn(item.id)}
              onDragEnd={() => setDragId(null)}
              className={cn(
                "gap-space-3 border-line py-space-3 grid grid-cols-[auto_72px_1fr] items-center border-b md:grid-cols-[auto_72px_1fr_auto]",
                dragId === item.id && "opacity-50",
              )}
            >
              <GripVertical aria-hidden="true" className="text-ink-muted size-5 cursor-grab" />
              <Thumb item={item} />
              <div className="gap-space-1 flex min-w-0 flex-col">
                <span className="label text-ink-muted">
                  {i === 0 ? "Cover · " : ""}
                  {item.type === "video" ? `Video · ${videoStatus(item.status)}` : "Photo"}
                </span>
                <label className="sr-only" htmlFor={`alt-${item.id}`}>
                  Description of {item.type} {i + 1}
                </label>
                <input
                  id={`alt-${item.id}`}
                  defaultValue={item.alt}
                  maxLength={300}
                  onBlur={(e) => saveAlt(item, e.target.value)}
                  className={cellInput}
                />
              </div>
              <div className="gap-space-1 col-span-3 flex justify-end md:col-span-1">
                <IconButton
                  label={`Move ${item.type} ${i + 1} up`}
                  disabled={busy || i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ArrowUp className="size-4" />
                </IconButton>
                <IconButton
                  label={`Move ${item.type} ${i + 1} down`}
                  disabled={busy || i === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ArrowDown className="size-4" />
                </IconButton>
                <IconButton
                  label={`Delete ${item.type} ${i + 1}`}
                  disabled={busy}
                  onClick={() => remove(item)}
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
              <ViewSettings productId={productId} item={item} onMessage={setMessage} />
            </li>
          ))}
        </ol>
      )}
      <FormStatus state={message} />

      <ImageUploader productId={productId} />
      <VideoUploader productId={productId} muxReady={muxReady} />
    </div>
  );
}

function ImageUploader({ productId }: { productId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending[]>([]);
  const [over, setOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const [state, action, uploading] = useActionState(async (prev: ActionState, form: FormData) => {
    const queued = pendingRef.current;
    for (const p of queued) {
      form.append("files", p.file);
      form.append("alts", p.alt);
    }
    const res = await uploadImages(productId, prev, form);
    if (res.status === "saved") {
      queued.forEach((p) => URL.revokeObjectURL(p.preview));
      setPending([]);
      router.refresh();
    }
    return res;
  }, initial);

  function add(files: FileList | null) {
    if (!files) return;
    const accepted: Pending[] = [];
    const rejected: string[] = [];
    for (const file of Array.from(files)) {
      if (!IMAGE_TYPES[file.type] || file.size > MAX_IMAGE_BYTES) rejected.push(file.name);
      else accepted.push({ key: crypto.randomUUID(), file, preview: URL.createObjectURL(file), alt: "" });
    }
    setLocalError(
      rejected.length ? `Skipped ${rejected.join(", ")}: use JPG, PNG, WebP or AVIF up to 8 MB.` : null,
    );
    setPending((p) => [...p, ...accepted]);
  }

  const missingAlt = pending.some((p) => p.alt.trim() === "");

  return (
    <form action={action} className="gap-space-3 flex flex-col">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          add(e.dataTransfer.files);
        }}
        className={cn(
          "gap-space-2 border-line px-space-4 py-space-5 flex flex-col items-center border border-dashed text-center",
          over && "border-ink bg-surface-sunk",
        )}
      >
        <p className="text-body-s">Drop photos here</p>
        <p className="text-caption text-ink-muted">JPG, PNG, WebP or AVIF, up to 8 MB each</p>
        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          Choose photos
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="sr-only"
          aria-label="Choose photos"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {localError && <p className="text-body-s text-critical">{localError}</p>}

      {pending.length > 0 && (
        <ul className="gap-space-3 flex flex-col">
          {pending.map((p, i) => (
            <li key={p.key} className="gap-space-3 grid grid-cols-[72px_1fr_auto] items-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img src={p.preview} alt="" className="bg-surface-sunk aspect-[4/5] w-[72px] object-cover" />
              <div className="gap-space-1 flex flex-col">
                <label htmlFor={`new-alt-${p.key}`} className="label text-ink-muted">
                  Describe photo {i + 1} (required)
                </label>
                <input
                  id={`new-alt-${p.key}`}
                  value={p.alt}
                  maxLength={300}
                  required
                  placeholder="e.g. Model in the black dress, front view"
                  onChange={(e) =>
                    setPending((all) => all.map((x) => (x.key === p.key ? { ...x, alt: e.target.value } : x)))
                  }
                  className={cellInput}
                />
              </div>
              <IconButton
                label={`Remove photo ${i + 1} from upload`}
                onClick={() => {
                  URL.revokeObjectURL(p.preview);
                  setPending((all) => all.filter((x) => x.key !== p.key));
                }}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      {pending.length > 0 && (
        <div className="gap-space-2 flex flex-col sm:max-w-xs">
          <Button type="submit" size="sm" disabled={uploading || missingAlt}>
            {uploading
              ? "Uploading"
              : `Upload ${pending.length === 1 ? "photo" : `${pending.length} photos`}`}
          </Button>
          {missingAlt && <p className="text-caption text-ink-muted">Describe every photo to upload.</p>}
        </div>
      )}
      <FormStatus state={state} />
    </form>
  );
}

function VideoUploader({ productId, muxReady }: { productId: string; muxReady: boolean }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [alt, setAlt] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [state, setState] = useState<ActionState>(initial);

  if (!muxReady) {
    return (
      <div className="gap-space-1 border-line pt-space-3 flex flex-col border-t">
        <p className="label text-ink-muted">Movement video</p>
        <p className="text-body-s text-ink-muted">Video upload needs Mux keys. Photos work without them.</p>
      </div>
    );
  }

  async function start() {
    if (!file) return;
    setState(initial);
    const res = await createVideoUpload(productId, alt);
    if (res.status === "error") return setState({ status: "error", message: res.message });
    setProgress(0);
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      if (xhr.status >= 200 && xhr.status < 300) {
        setFile(null);
        setAlt("");
        setState({
          status: "saved",
          message: "Uploaded. Mux is processing the video; it appears in the shop when ready.",
        });
        router.refresh();
      } else {
        setState({ status: "error", message: "The video didn't upload. Try again." });
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      setState({ status: "error", message: "The video didn't upload. Check your connection and try again." });
    };
    xhr.open("PUT", res.uploadUrl);
    xhr.send(file);
  }

  return (
    <div className="gap-space-3 border-line pt-space-3 flex flex-col border-t">
      <p className="label text-ink-muted">Movement video</p>
      <label className="gap-space-1 text-body-s flex flex-col">
        <span className="label text-ink-muted">Video file</span>
        <input
          type="file"
          accept="video/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-body-s"
        />
      </label>
      <label className="gap-space-1 flex flex-col">
        <span className="label text-ink-muted">Describe the video (required)</span>
        <input value={alt} maxLength={300} onChange={(e) => setAlt(e.target.value)} className={cellInput} />
      </label>
      <div className="sm:max-w-xs">
        <Button type="button" size="sm" disabled={!file || !alt.trim() || progress !== null} onClick={start}>
          {progress !== null ? `Uploading ${progress}%` : "Upload video"}
        </Button>
      </div>
      <FormStatus state={state} />
    </div>
  );
}

function Thumb({ item }: { item: Item }) {
  if (item.type === "image" && item.url) {
    // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
    return <img src={item.url} alt="" className="bg-surface-sunk aspect-[4/5] w-[72px] object-cover" />;
  }
  if (item.type === "video" && item.mux_playback_id) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Mux poster frame
      <img
        src={`https://image.mux.com/${item.mux_playback_id}/thumbnail.webp?width=144`}
        alt=""
        className="bg-surface-sunk aspect-[4/5] w-[72px] object-cover"
      />
    );
  }
  return <span aria-hidden="true" className="bg-surface-sunk aspect-[4/5] w-[72px]" />;
}

function videoStatus(status: AdminMedia["status"]) {
  return status === "ready"
    ? "ready"
    : status === "processing"
      ? "processing"
      : "failed, delete and re-upload";
}

function IconButton({
  label,
  children,
  ...props
}: { label: string; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="text-ink hover:bg-surface-sunk inline-flex size-11 items-center justify-center disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  );
}

/** Caption, crop focus, zoom and pan effect for one gallery view (PDP-2). */
function ViewSettings({
  productId,
  item,
  onMessage,
}: {
  productId: string;
  item: Item;
  onMessage: (state: ActionState) => void;
}) {
  const [label, setLabel] = useState(item.label);
  const [focus, setFocus] = useState(item.focus ?? "");
  const [zoom, setZoom] = useState(String(item.zoom));
  const [effect, setEffect] = useState<"none" | "pan">(item.effect);
  const [duration, setDuration] = useState(item.duration_sec ? String(item.duration_sec) : "");
  const [saving, startSaving] = useTransition();
  const id = (field: string) => `${field}-${item.id}`;

  function save() {
    startSaving(async () => {
      const res = await updateMediaDisplay(productId, item.id, {
        label,
        focus,
        zoom,
        effect,
        duration_sec: effect === "pan" ? duration : "",
      });
      onMessage(res.status === "error" ? res : { status: "saved", message: "View saved." });
    });
  }

  return (
    <details className="col-span-full">
      <summary className="label text-ink-muted hover:text-ink inline-flex min-h-11 cursor-pointer items-center">
        View settings{item.label ? ` · ${item.label}` : ""}
      </summary>
      <div className="gap-space-3 pb-space-2 grid sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
        <label htmlFor={id("label")} className="gap-space-1 flex flex-col">
          <span className="label text-ink-muted">Caption</span>
          <input
            id={id("label")}
            value={label}
            maxLength={60}
            placeholder="Full silhouette"
            onChange={(e) => setLabel(e.target.value)}
            className={cellInput}
          />
        </label>
        <label htmlFor={id("focus")} className="gap-space-1 flex flex-col">
          <span className="label text-ink-muted">Focus (across, down)</span>
          <input
            id={id("focus")}
            value={focus}
            placeholder="50% 40%"
            onChange={(e) => setFocus(e.target.value)}
            className={cellInput}
          />
        </label>
        <label htmlFor={id("zoom")} className="gap-space-1 flex flex-col">
          <span className="label text-ink-muted">Zoom (1 to 3)</span>
          <input
            id={id("zoom")}
            type="number"
            min={1}
            max={3}
            step={0.05}
            inputMode="decimal"
            value={zoom}
            onChange={(e) => setZoom(e.target.value)}
            className={cellInput}
          />
        </label>
        {item.type === "image" && (
          <label htmlFor={id("effect")} className="gap-space-1 flex flex-col">
            <span className="label text-ink-muted">Effect</span>
            <select
              id={id("effect")}
              value={effect}
              onChange={(e) => setEffect(e.target.value as "none" | "pan")}
              className={cellInput}
            >
              <option value="none">Still</option>
              <option value="pan">Movement reel (slow pan)</option>
            </select>
          </label>
        )}
        {effect === "pan" && (
          <label htmlFor={id("duration")} className="gap-space-1 flex flex-col">
            <span className="label text-ink-muted">Reel length (seconds)</span>
            <input
              id={id("duration")}
              type="number"
              min={1}
              max={600}
              inputMode="numeric"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={cellInput}
            />
          </label>
        )}
        <div>
          <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={save}>
            {saving ? "Saving" : "Save view"}
          </Button>
        </div>
      </div>
    </details>
  );
}
