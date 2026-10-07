'use client';

import { useRouter } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';
import { Icon } from '@/components/ui/Icon';
import { LOCALES } from '@/i18n/config';
import { useSwitchLocale } from '@/lib/client/locale';
import { startNavigationProgress } from '@/lib/client/navigation-progress';
import { lockScroll, unlockScroll } from '@/lib/client/scroll-lock';
import { useTheme } from '@/lib/client/theme';
import { cn } from '@/lib/cn';
import { buildCommands, filterCommands, GROUP_ORDER, type Command, type CommandHandlers } from './commands';
import type { ChromeData } from './types';

/** Cmd/Ctrl+K belongs to the palette only when the visitor isn't typing. */
function isEditable(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable;
}

function download(href: string) {
  const a = document.createElement('a');
  a.href = href;
  a.download = '';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

interface CommandPaletteProps {
  data: ChromeData;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
}

/**
 * Cmd/Ctrl+K command palette. This component owns the global shortcut; the
 * panel mounts only while open, so every opening starts from fresh state.
 */
export function CommandPalette({ data, open, onOpen, onClose }: CommandPaletteProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k') {
        if (open) {
          e.preventDefault();
          onClose();
        } else if (!isEditable(e.target)) {
          e.preventDefault();
          onOpen();
        }
        return;
      }
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpen, onClose]);

  return open ? <PalettePanel data={data} onClose={onClose} /> : null;
}

function PalettePanel({ data, onClose }: { data: ChromeData; onClose: () => void }) {
  const router = useRouter();
  const [theme, setTheme] = useTheme();
  const switchLocale = useSwitchLocale();
  const T = data.dict.palette;

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const handlers = useMemo<CommandHandlers>(
    () => ({
      navigate: (href) => {
        startNavigationProgress(href);
        router.push(href);
      },
      openExternal: (url) => window.open(url, '_blank', 'noopener,noreferrer'),
      download,
      toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      toggleLocale: () => {
        const next = LOCALES[(LOCALES.indexOf(data.locale) + 1) % LOCALES.length];
        if (next) switchLocale(next);
      },
      copy: (text) => {
        navigator.clipboard.writeText(text).then(
          () => {
            setStatus(T.copied);
            setCopied(true);
          },
          // Insecure context or denied permission: show the address to copy by hand.
          () => setStatus(`${T.copyFailed} ${text}`),
        );
      },
    }),
    [router, theme, setTheme, switchLocale, data.locale, T],
  );

  const commands = useMemo(() => buildCommands(data, theme, handlers), [data, theme, handlers]);
  const visible = useMemo(() => filterCommands(commands, query), [commands, query]);
  // Clamp during render so Enter always has a target.
  const activeIdx = visible.length ? Math.min(active, visible.length - 1) : -1;

  const run = useCallback(
    (cmd: Command | undefined) => {
      if (!cmd) return;
      if (!cmd.keepOpen) onClose();
      cmd.run();
    },
    [onClose],
  );

  // Long enough to read the confirmation, short enough not to feel stuck.
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(onClose, 1200);
    return () => clearTimeout(id);
  }, [copied, onClose]);

  // A layout effect so focus() happens inside the opening gesture (the only
  // way iOS Safari raises the software keyboard). Restores focus on close.
  useLayoutEffect(() => {
    const opener = document.activeElement;
    lockScroll();
    inputRef.current?.focus();
    return () => {
      unlockScroll();
      if (opener instanceof HTMLElement && document.contains(opener)) opener.focus();
    };
  }, []);

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, visible]);

  const onPanelKeyDown = (e: ReactKeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (visible.length) setActive((activeIdx + 1) % visible.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (visible.length) setActive((activeIdx - 1 + visible.length) % visible.length);
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(Math.max(0, visible.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        run(visible[activeIdx]);
        break;
      // Only the input and close button take focus: a two-stop focus trap.
      case 'Tab':
        if (!e.shiftKey && e.target === closeRef.current) {
          e.preventDefault();
          inputRef.current?.focus();
        } else if (e.shiftKey && e.target === inputRef.current) {
          e.preventDefault();
          closeRef.current?.focus();
        }
        break;
    }
  };

  const activeCmd = visible[activeIdx];
  const count = `${visible.length} ${visible.length === 1 ? T.result : T.results}`;

  return (
    <>
      <div className="fixed inset-0 z-[70] animate-fade-in bg-scrim backdrop-blur-[3px]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={T.title}
        onKeyDown={onPanelKeyDown}
        className="glass-strong fixed inset-x-0 top-2.5 z-[71] mx-auto flex max-h-[calc(100dvh-1.25rem)] w-[min(40rem,calc(100vw-1.25rem))] animate-overlay-in flex-col overflow-hidden rounded-xl sm:top-[clamp(3.5rem,12vh,8rem)] sm:max-h-[min(72dvh,35rem)]"
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-line py-3 pr-3 pl-4 transition-colors focus-within:border-brand/50">
          <Icon name="search" className="size-[18px] shrink-0 text-fg-faint" />
          <input
            ref={inputRef}
            // 16px keeps iOS from zooming the page in on focus.
            className="min-w-0 flex-1 bg-transparent py-1.5 text-base text-fg outline-none placeholder:text-fg-faint focus-visible:outline-none"
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder={T.placeholder}
            aria-label={T.placeholder}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdp-list"
            aria-autocomplete="list"
            aria-activedescendant={activeCmd ? `cmdp-opt-${activeCmd.id}` : undefined}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            inputMode="search"
            autoCapitalize="off"
            enterKeyHint="go"
          />
          <button
            ref={closeRef}
            type="button"
            aria-label={T.close}
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-md border border-line text-fg-muted transition-colors hover:bg-fg/[0.06] hover:text-fg [&_svg]:size-3.5"
          >
            <Icon name="x" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-1.5" id="cmdp-list" role="listbox" aria-label={T.title} ref={listRef}>
          {visible.length === 0 && (
            <div className="px-4 py-10 text-center">
              <div className="font-display text-body font-medium text-fg">{T.empty}</div>
              <div className="mt-1.5 text-body-sm text-fg-muted">{T.emptyHint}</div>
            </div>
          )}

          {GROUP_ORDER.map((group) => {
            const items = visible.filter((c) => c.group === group);
            if (!items.length) return null;
            return (
              <div role="group" aria-label={T.groups[group]} key={group}>
                <div className="px-3 pt-3 pb-1.5 font-mono text-micro tracking-[0.16em] text-fg-faint uppercase" aria-hidden="true">
                  {T.groups[group]}
                </div>
                {items.map((cmd) => {
                  const i = visible.indexOf(cmd);
                  const on = i === activeIdx;
                  return (
                    <div
                      key={cmd.id}
                      id={`cmdp-opt-${cmd.id}`}
                      role="option"
                      aria-selected={on}
                      data-active={on ? 'true' : undefined}
                      className={cn(
                        'relative flex min-h-12 cursor-pointer items-center gap-3 rounded-md px-3 py-2 transition-colors duration-150',
                        on
                          ? 'bg-fg/[0.06] text-fg before:absolute before:top-1/2 before:left-0.5 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:bg-brand'
                          : 'text-fg-muted',
                      )}
                      // Move, not enter: a parked cursor must not steal arrow-key selection.
                      onMouseMove={() => setActive(i)}
                      onClick={() => run(cmd)}
                    >
                      <span
                        className={cn(
                          'grid size-8 shrink-0 place-items-center rounded-md border transition-colors [&_svg]:size-4',
                          on ? 'border-brand/35 bg-brand-soft text-brand-fg' : 'border-line bg-fg/[0.03] text-fg-muted',
                        )}
                      >
                        <Icon name={cmd.icon} />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={cn('truncate text-body-sm font-medium', on ? 'text-fg' : 'text-fg-muted')}>{cmd.label}</span>
                        {cmd.hint && <span className="truncate text-micro text-fg-faint">{cmd.hint}</span>}
                      </span>
                      <Icon
                        name={cmd.external ? 'arrowUpRight' : 'arrowRight'}
                        className={cn('size-4 shrink-0 text-brand-fg transition-opacity', on ? 'opacity-100' : 'opacity-0')}
                      />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="flex shrink-0 items-center justify-between gap-4 border-t border-line bg-fg/[0.02] px-4 py-2.5">
          <div className="min-w-0 text-micro text-fg-faint" role="status" aria-live="polite">
            {status ?? count}
          </div>
          <div
            className="hidden items-center gap-1.5 font-mono text-micro whitespace-nowrap text-fg-faint sm:flex [&_kbd]:inline-grid [&_kbd]:h-[18px] [&_kbd]:min-w-[18px] [&_kbd]:place-items-center [&_kbd]:rounded-[5px] [&_kbd]:border [&_kbd]:border-line [&_kbd]:bg-fg/[0.04] [&_kbd]:px-1 [&_kbd]:text-fg-muted [&_span]:mr-2 [&_span:last-child]:mr-0"
            aria-hidden="true"
          >
            <kbd>&#8593;</kbd>
            <kbd>&#8595;</kbd>
            <span>{T.hints.navigate}</span>
            <kbd>&#8629;</kbd>
            <span>{T.hints.select}</span>
            <kbd>Esc</kbd>
            <span>{T.hints.close}</span>
          </div>
        </div>
      </div>
    </>
  );
}
