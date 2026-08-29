import { useMemo, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { AppProvider, useApp } from './context/AppContext';
import { SCREEN_IDS, idToPath } from './data/screens';
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

const COMPONENTS = {
  home: Hero, about: AboutScreen, projects: ProjectsScreen,
  experience: Experience, resume: Resume, contact: Contact,
};

function AppInner() {
  const { strings } = useApp();

  const SCREENS = useMemo(() => SCREEN_IDS.map((id) => ({
    id, label: strings.nav[id], path: idToPath(id), Comp: COMPONENTS[id],
  })), [strings]);

  useEffect(() => {
    let id1, id2;
    id1 = requestAnimationFrame(() => {
      id2 = requestAnimationFrame(() => {
        document.body.classList.add('anim-ready');
        window.__animReady = true;
      });
    });
    return () => { cancelAnimationFrame(id1); cancelAnimationFrame(id2); };
  }, []);

  return (
    <>
      <Background />
      <Nav screens={SCREENS} />
      <main>
        <Routes>
          {SCREENS.map((s, i) => (
            <Route key={s.id} path={s.path} element={
              <div className="screen" data-screen-label={s.label}>
                <div className="screen-body">
                  <s.Comp />
                </div>
                <Pager index={i} screens={SCREENS} />
              </div>
            } />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Footer screens={SCREENS} />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppInner />
        <Analytics />
        <SpeedInsights />
      </AppProvider>
    </BrowserRouter>
  );
}
