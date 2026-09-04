import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { buildCommands, filterCommands, GROUP_ORDER } from '../data/commands';
import { lockScroll, unlockScroll } from '../utils/scrollLock';
import Icon from '../ui/Icon';

// Cmd/Ctrl+K is only ours when the visitor isn't typing — the contact form
// keeps its own keystrokes.
function isEditable(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export default function CommandPalette({ open, onOpen, onClose, screens }) {
  const { data, strings, theme, setTheme, locale, setLocale, LOCALES } = useApp();
  const navigate = useNavigate();
  const T = strings.palette;

  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState(null);

  const inputRef  = useRef(null);
  const closeRef  = useRef(null);
  const listRef   = useRef(null);
  const openerRef = useRef(null);
  const copyTimer = useRef(0);

  const handlers = useMemo(() => ({
    navigate: (path) => navigate(path),
    openExternal: (url) => window.open(url, '_blank', 'noopener,noreferrer'),
    // `download` can't ride along on a router navigation, so this mirrors what
    // the Resume screen's own download button does.
    download: (href) => {
      const a = document.createElement('a');
      a.href = href;
      a.download = '';
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
    toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    toggleLocale: () => setLocale(LOCALES[(LOCALES.indexOf(locale) + 1) % LOCALES.length]),
    copy: async (email) => {
      try {
        await navigator.clipboard.writeText(email);
        setStatus(T.copied);
        // Long enough to read the confirmation, short enough not to feel stuck.
        copyTimer.current = window.setTimeout(onClose, 1200);
      } catch {
        // Insecure context or a denied permission — show the address so it can
        // still be selected by hand, and leave the palette open to do it.
        setStatus(`${T.copyFailed} ${email}`);
      }
    },
  }), [navigate, setTheme, theme, setLocale, locale, LOCALES, T, onClose]);

  const commands = useMemo(
    () => buildCommands({ screens, identity: data.identity, strings, theme, handlers }),
    [screens, data.identity, strings, theme, handlers],
  );
  const visible = useMemo(() => filterCommands(commands, query), [commands, query]);

  // The reset-to-top effect below only runs after paint, so clamp here too —
  // otherwise the frame in which a query shrinks the list renders with nothing
  // selected, and Enter in that frame would do nothing.
  const activeIdx = visible.length ? Math.min(active, visible.length - 1) : -1;

  const run = useCallback((cmd) => {
    if (!cmd) return;
    // Closing first keeps focus restoration ahead of the route change; the
    // command still runs inside the same user gesture, so window.open is fine.
    if (!cmd.keepOpen) onClose();
    cmd.run();
  }, [onClose]);

  // Opening resets the palette, locks the page behind it, and remembers who
  // opened it so focus has somewhere to go back to.
  //
  // A layout effect, not a passive one. React flushes discrete events
  // synchronously, so focusing here still happens inside the tap that opened
  // the palette — and an in-gesture focus() is the only kind iOS Safari will
  // raise the software keyboard for. Off a passive effect (or a rAF) the caret
  // lands in the field but the keyboard stays down.
  useLayoutEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement;
    setQuery('');
    setActive(0);
    setStatus(null);
    lockScroll();
    inputRef.current?.focus();
    return () => {
      clearTimeout(copyTimer.current);
      unlockScroll();
      const opener = openerRef.current;
      if (opener && document.contains(opener) && typeof opener.focus === 'function') opener.focus();
      openerRef.current = null;
    };
  }, [open]);

  // One global listener, on a component that lives outside <Routes> — it is
  // never re-attached by navigation, and always torn down with its effect.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
        if (open) { e.preventDefault(); onClose(); return; }
        if (isEditable(e.target)) return;
        e.preventDefault();
        onOpen();
        return;
      }
      if (e.key === 'Escape' && open) { e.preventDefault(); onClose(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onOpen, onClose]);

  useEffect(() => { setActive(0); }, [query]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [active, open, query]);

  const onPanelKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (visible.length) setActive((i) => (i + 1) % visible.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (visible.length) setActive((i) => (i - 1 + visible.length) % visible.length);
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
      // Only the input and the close button take focus, so a two-stop cycle is
      // the whole trap — and Escape always leaves.
      case 'Tab':
        if (!e.shiftKey && e.target === closeRef.current) {
          e.preventDefault();
          inputRef.current?.focus();
        } else if (e.shiftKey && e.target === inputRef.current) {
          e.preventDefault();
          closeRef.current?.focus();
        }
        break;
      default:
        break;
    }
  };

  if (!open) return null;

  const activeId = visible[activeIdx] ? `cmdp-opt-${visible[activeIdx].id}` : undefined;
  const count = `${visible.length} ${visible.length === 1 ? T.result : T.results}`;

  return (
    <>
      <div className="cmdp-scrim" onClick={onClose} />
      <div
        className="cmdp-panel"
        role="dialog"
        aria-modal="true"
        aria-label={T.title}
        onKeyDown={onPanelKeyDown}
      >
        <div className="cmdp-head">
          <Icon name="search" className="cmdp-head-ic" />
          <input
            ref={inputRef}
            className="cmdp-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={T.placeholder}
            aria-label={T.placeholder}
            role="combobox"
            aria-expanded="true"
            aria-controls="cmdp-list"
            aria-autocomplete="list"
            aria-activedescendant={activeId}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            // Software-keyboard hints: a search layout, no auto-capitalised
            // first letter on a command, and a "Go" key instead of a newline.
            inputMode="search"
            autoCapitalize="off"
            enterKeyHint="go"
          />
          <button ref={closeRef} type="button" className="cmdp-close" aria-label={T.close} onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>

        <div className="cmdp-list" id="cmdp-list" role="listbox" aria-label={T.title} ref={listRef}>
          {visible.length === 0 && (
            <div className="cmdp-empty">
              <div className="cmdp-empty-t">{T.empty}</div>
              <div className="cmdp-empty-s">{T.emptyHint}</div>
            </div>
          )}

          {GROUP_ORDER.map((group) => {
            const items = visible.filter((c) => c.group === group);
            if (!items.length) return null;
            return (
              <div className="cmdp-group" role="group" aria-label={T.groups[group]} key={group}>
                <div className="cmdp-group-title mono" aria-hidden="true">{T.groups[group]}</div>
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
                      className={`cmdp-item ${on ? 'is-active' : ''}`}
                      // Move, not enter: a cursor parked over the list must not
                      // steal the selection while the arrow keys scroll it.
                      onMouseMove={() => setActive(i)}
                      onClick={() => run(cmd)}
                    >
                      <span className="cmdp-item-ic"><Icon name={cmd.icon} /></span>
                      <span className="cmdp-item-text">
                        <span className="cmdp-item-label">{cmd.label}</span>
                        {cmd.hint && <span className="cmdp-item-hint">{cmd.hint}</span>}
                      </span>
                      <Icon name={cmd.external ? 'arrowUpRight' : 'arrowRight'} className="cmdp-item-go" />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <div className="cmdp-foot">
          <div className="cmdp-status" role="status" aria-live="polite">{status || count}</div>
          <div className="cmdp-keys mono" aria-hidden="true">
            <kbd>&#8593;</kbd><kbd>&#8595;</kbd><span>{T.hints.navigate}</span>
            <kbd>&#8629;</kbd><span>{T.hints.select}</span>
            <kbd>Esc</kbd><span>{T.hints.close}</span>
          </div>
        </div>
      </div>
    </>
  );
}
