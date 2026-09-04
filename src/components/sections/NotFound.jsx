import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import Reveal from '../../ui/Reveal';
import Icon from '../../ui/Icon';

export default function NotFound() {
  const { strings } = useApp();
  const T = strings.notFound;
  const navigate = useNavigate();

  return (
    <section className="band nf">
      <div className="wrap nf-inner">
        <Reveal as="div" className="nf-code mono">{T.code}</Reveal>

        <Reveal delay={110}>
          <h1 className="h-section">{T.heading}</h1>
        </Reveal>

        <Reveal delay={170}>
          <p className="lead nf-lead">{T.lead}</p>
        </Reveal>

        <Reveal delay={230}>
          <div className="nf-cta">
            <Link to="/" className="btn btn-primary">
              {T.home} <Icon name="arrowRight" />
            </Link>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)}>
              <Icon name="arrowLeft" /> {T.back}
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
