import Reveal from './Reveal';

export default function SectionHead({ idx, label, title, sub, center, children }) {
  return (
    <Reveal className={`section-head ${center ? 'center' : ''}`}>
      <div className="eyebrow">
        {idx && <span className="idx">{idx}</span>}
        <span className="bar" />
        <span>{label}</span>
      </div>
      <h2 className="h-section">{title}</h2>
      {sub && <p className="sub">{sub}</p>}
      {children}
    </Reveal>
  );
}
