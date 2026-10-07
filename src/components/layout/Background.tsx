/** Decorative layered background (grid, glows, vignette, noise). */
export function Background() {
  return (
    <div id="bg-layer" aria-hidden="true">
      <div className="bg-grid" />
      <div className="bg-glow bg-glow-blue" />
      <div className="bg-glow bg-glow-gold" />
      <div className="bg-vignette" />
      <div className="bg-noise" />
    </div>
  );
}
