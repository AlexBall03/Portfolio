/** sessionStorage key: the loading screen plays once per browser session. */
export const SPLASH_STORAGE_KEY = 'splash-seen';

/** On loading-screen loads the count waits this long at 0, until the mark, bar, and label have arrived. */
const INTRO_MS = 250;
/** Then it follows at least this pace (ms from 0 to 100), so the whole climb is visible, never a jump. */
const MIN_COUNT_MS = 1100;
/**
 * At 100% the brass completion flash starts (`data-boot-done`; 140ms delay, peak
 * about 200ms later). The screen starts dissolving at that peak, so the flash is
 * the conclusion and fades out with the screen rather than being followed by a wait.
 */
const HOLD_MS = 340;
/** Give up waiting on slow resources; the page underneath is already usable. */
const FAILSAFE_MS = 8000;

/**
 * Runs inline in <head> before first paint. Decides whether this load gets the
 * loading screen (`data-splash="on"`) or just the top boot bar (`"off"`), then
 * drives `--boot` (0–100) each frame and marks `data-booted` when the page is
 * ready. Everything lives on <html>, which already tolerates pre-hydration
 * attribute changes. Must be self-contained: it is serialized into the page as
 * a string.
 *
 * The shown value is honest: it never passes what has really loaded (milestones:
 * parsed 45, fonts 72/88, everything 100). Between milestones it creeps toward
 * the next one so it never looks frozen, and on loading-screen loads it also
 * waits for its entrance, then follows a minimum pace, so even a fast load shows
 * the whole climb. At 100 it sets `data-boot-done` (the brass completion flash)
 * and holds until the flash has played, then boots. While the
 * screen is up, wheel, touch, and scroll keys are blocked (listeners removed on
 * boot, or after the failsafe), instead of overflow: hidden, which would hide
 * the scrollbar and shift the page sideways when it came back.
 */
export function splashInitScript(): string {
  return `(function(){
var d=document.documentElement,on=false;
try{if(!sessionStorage.getItem(${JSON.stringify(SPLASH_STORAGE_KEY)})){sessionStorage.setItem(${JSON.stringify(SPLASH_STORAGE_KEY)},'1');on=true}}catch(e){}
d.setAttribute('data-splash',on?'on':'off');
var stops=[];if(on){var block=function(e){if(e.type!=='keydown'||/^(Arrow(Up|Down)|Page(Up|Down)|Home|End| )$/.test(e.key))e.preventDefault()};['wheel','touchmove','keydown'].forEach(function(t){addEventListener(t,block,{passive:false});stops.push(function(){removeEventListener(t,block,{passive:false})})})}
var t0=performance.now(),real=8,since=t0,shown=-1,fullAt=0,loaded=false,fonts=false;
function mark(v){if(v>real){real=v;since=performance.now()}}
function frame(now){
var ceil=real>=100?100:real+(Math.min(real+24,96)-real)*(1-Math.exp(-(now-since)/1600));
var k=Math.min(1,Math.max(0,now-t0-${INTRO_MS})/${MIN_COUNT_MS}),pace=on?100*(1-Math.pow(1-k,3)):100;
var v=Math.round(Math.max(shown,Math.min(ceil,pace)));
if(v!==shown){shown=v;d.style.setProperty('--boot',String(v))}
if(v>=100){if(!fullAt){fullAt=now;if(on)d.setAttribute('data-boot-done','')}if(now-fullAt>=(on?${HOLD_MS}:120)){d.setAttribute('data-booted','');stops.forEach(function(s){s()});return}}
requestAnimationFrame(frame)}
document.addEventListener('DOMContentLoaded',function(){mark(45)});
if(document.fonts&&document.fonts.ready){document.fonts.ready.then(function(){fonts=true;mark(loaded?100:72)})}else{fonts=true}
addEventListener('load',function(){loaded=true;mark(fonts?100:88)});
setTimeout(function(){mark(100)},${FAILSAFE_MS});
setTimeout(function(){stops.forEach(function(s){s()})},${FAILSAFE_MS + 2000});
requestAnimationFrame(frame)})()`;
}
