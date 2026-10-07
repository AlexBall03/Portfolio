/** Decorative atmosphere (grid, ambient light, vignette, noise). Static and token-driven. */
export function Background() {
  return (
    <div className="atmosphere" aria-hidden="true">
      <div className="atmosphere-grid" />
      <div className="atmosphere-glow atmosphere-glow-brand" />
      <div className="atmosphere-glow atmosphere-glow-accent" />
      <div className="atmosphere-vignette" />
      <div className="atmosphere-noise" />
    </div>
  );
}
