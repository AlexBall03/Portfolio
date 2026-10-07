/** sessionStorage key: the loading screen plays once per browser session. */
export const SPLASH_STORAGE_KEY = 'splash-seen';

/** The splash stays up at least this long once shown, so it never just flickers. */
const MIN_SPLASH_MS = 700;
/** Give up waiting on slow resources; the page underneath is already usable. */
const FAILSAFE_MS = 8000;

/**
 * Runs inline in <head> before first paint. Decides whether this load gets the
 * loading screen (`data-splash="on"`) or just the top boot bar (`"off"`), then
 * reports real load milestones through `--boot` (0–100) and marks
 * `data-booted` when the page is ready. Everything lives on <html>, which
 * already tolerates pre-hydration attribute changes. Must be self-contained:
 * it is serialized into the page as a string.
 */
export function splashInitScript(): string {
  return `(function(){var d=document.documentElement,on=false;try{if(!sessionStorage.getItem(${JSON.stringify(SPLASH_STORAGE_KEY)})){sessionStorage.setItem(${JSON.stringify(SPLASH_STORAGE_KEY)},'1');on=true}}catch(e){}d.setAttribute('data-splash',on?'on':'off');var t0=performance.now(),p=0,loaded=false,fonts=false,done=false;function set(v){if(v>p){p=v;d.style.setProperty('--boot',String(v))}}function finish(){if(done)return;done=true;set(100);var wait=on?Math.max(0,${MIN_SPLASH_MS}-(performance.now()-t0)):0;setTimeout(function(){d.setAttribute('data-booted','')},wait+260)}function check(){if(loaded&&fonts)finish()}set(12);document.addEventListener('DOMContentLoaded',function(){set(45)});if(document.fonts&&document.fonts.ready){document.fonts.ready.then(function(){fonts=true;set(loaded?100:72);check()})}else{fonts=true}addEventListener('load',function(){loaded=true;set(fonts?100:88);check()});setTimeout(finish,${FAILSAFE_MS})})()`;
}
