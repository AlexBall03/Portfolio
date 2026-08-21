import { useMemo, useEffect } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { AppProvider, useApp } from './context/AppContext';
import Background from './components/Background';
import Nav from './components/Nav';
import Footer from './components/Footer';
import Pager from './components/Pager';
import Hero from './components/Hero';
import Snapshot from './components/sections/Snapshot';
import About from './components/sections/About';
import Stack from './components/sections/Stack';
import Projects from './components/sections/Projects';
import GitHub from './components/sections/GitHub';
import Experience from './components/sections/Experience';
import Resume from './components/sections/Resume';
import Contact from './components/sections/Contact';

function AboutScreen()    { return <><Snapshot /><About /><Stack /></>; }
function ProjectsScreen() { return <><Projects /><GitHub /></>; }

function AppInner() {
  const { strings, screen } = useApp();

  const SCREENS = useMemo(() => [
    { id: 'home',       label: strings.nav.home,       Comp: Hero           },
    { id: 'about',      label: strings.nav.about,      Comp: AboutScreen    },
    { id: 'projects',   label: strings.nav.projects,   Comp: ProjectsScreen },
    { id: 'experience', label: strings.nav.experience, Comp: Experience     },
    { id: 'resume',     label: strings.nav.resume,     Comp: Resume         },
    { id: 'contact',    label: strings.nav.contact,    Comp: Contact        },
  ], [strings]);

  const index = SCREENS.findIndex((s) => s.id === screen);
  const { Comp: Current } = SCREENS[index];

  useEffect(() => {
    let id1, id2;
    id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        document.body.classList.add('anim-ready');
      });
    });
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2); };
  }, []);

  return (
    <>
      <Background />
      <Nav screens={SCREENS} />
      <main>
        <div key={screen} className="screen" data-screen-label={SCREENS[index].label}>
          <Current />
          <Pager index={index} screens={SCREENS} />
        </div>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
      <Analytics />
    </AppProvider>
  );
}
