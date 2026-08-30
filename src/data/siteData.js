// All site content, per locale.
// Edit the `en` block for your real content, then mirror changes to `es`.
export const DATA_ALL = {
  en: {
    identity: {
      name: 'Alexander D. Ball',
      logo: '</Alex-Ball\\>',
      title: 'Software Engineer',
      statement: 'Building modern software with clarity, reliability, and purpose.',
      location: 'Arizona, USA',          // TODO: set your city/region
      availability: 'Open to Software Engineering roles',
      email: 'contact@alexball.dev',
      linkedin: 'https://www.linkedin.com/in/alexball03/',
      github: 'https://github.com/AlexBall03',
      githubHandle: 'AlexBall03',
      resume: '/assets/Alexander-Ball-Resume.pdf',
    },
    snapshot: [
      { icon: 'cap',    value: 50, suffix: '%', label: 'B.S. Degree Progress', note: 'Software Engineering' },
      { icon: 'code',   value: 1,  suffix: '+', label: 'Years Programming',    note: 'and counting' },
      { icon: 'cube',   value: 12, suffix: '',  label: 'Projects Built',       note: 'and growing', gold: true }, // TODO confirm count
      { icon: 'layers', value: 9,  suffix: '',  label: 'Technologies Used',    note: 'core stack' },
    ],
    projects: [],
    archive: [
      { n: '04', name: 'Portfolio Engine', desc: 'Static site generator for this very site', tags: ['JS', 'CSS'] },
      { n: '05', name: 'Query Lab',        desc: 'SQL practice + visualization sandbox',     tags: ['Oracle SQL', 'JS'] },
      { n: '06', name: 'TaskBoard',        desc: 'Kanban board with drag-and-drop persistence', tags: ['.NET', 'jQuery'] },
    ],
    career: [
      {
        date: 'March 2026 — Present', role: 'Junior Software Developer', org: 'ENSYTE Energy Software International', current: true,
        blurb: 'Replace with your current or most recent engineering role — what you build, the stack, and the impact.',
        tags: ['HTML', 'CSS', 'JavaScript', 'jQuery', 'Angular', 'C#/.NET', 'Oracle/SQL Server'],
      },
      {
        date: '2024 — 2025', role: 'Software Developer (Student)', org: 'Placeholder Org',
        blurb: 'A previous role, internship, or freelance engagement. Keep it to one scannable line of outcome.',
        tags: ['JavaScript', 'Bootstrap'],
      },
      {
        date: '2023 — 2024', role: 'IT / Support Technician', org: 'Placeholder',
        blurb: 'Earlier experience that built your technical foundation and professionalism.',
        tags: ['Troubleshooting'],
      },
    ],
    education: [
      {
        date: '2024 — Present', role: 'B.S. Software Engineering', org: 'Western Governors University', current: true,
        blurb: 'In progress — ~50% complete. Emphasis in Java.',
        tags: ['Algorithms', 'Databases', 'Software Engineering', 'Web Development', 'Data Structures', 'Java'],
      },
      {
        date: '2023', role: 'Associate / Foundations', org: 'Placeholder College',
        blurb: 'Prior coursework or program that started the journey. Replace with real details.',
        tags: ['CS Fundamentals'],
      },
      {
        date: 'Ongoing', role: 'Certifications', org: 'Self-directed',
        blurb: 'List relevant certifications or learning tracks here (e.g. Azure, SQL, .NET).',
        tags: ['In progress'],
      },
    ],
    stack: [
      { cat: 'Frontend', icon: 'code',     skills: ['HTML', 'CSS', 'JavaScript', 'Bootstrap', 'jQuery'] },
      { cat: 'Backend',  icon: 'server',   skills: ['C#', '.NET'] },
      { cat: 'Data',     icon: 'database', gold: true, skills: ['Microsoft SQL Server', 'Oracle SQL'] },
    ],
    learning: ['Docker', 'CI/CD', 'Azure', 'Linux', 'Kubernetes'],
    roles: [
      { t: 'Software Engineer',      gold: false  },
      { t: 'Music Director',         gold: true   },
      { t: 'Public Speaker',         gold: false  },
      { t: 'Meteorology Enthusiast', gold: true   },
      { t: 'Lifelong Learner',       gold: false  },
    ],
    about: [
      'I build modern software with an emphasis on clarity, reliability, and maintainability. My background blends hands-on engineering with leadership — and I bring the same discipline to code that I bring to directing a team.',
      'Currently pursuing a B.S. in Computer Science, I care about systems that are well-structured, well-tested, and built to last.',
    ],
    differentiators: [
      { icon: 'music',     t: 'Music leadership',       d: 'Years directing teams — coordination under pressure.' },
      { icon: 'mic',       t: 'Public speaking',         d: 'Comfortable presenting to technical and non-technical audiences.' },
      { icon: 'languages', t: 'Multilingual interests',  d: 'Actively studying additional languages.' },
      { icon: 'globe',     t: 'International experience', d: 'Mission trips and travel across cultures.' },
      { icon: 'cap',       t: 'Later coursework',        d: 'Planning to study DevOps and cloud infrastructure later in my CS degree.' },
    ],
    resumeHighlights: [
      { t: 'Full-stack capability',     d: 'Comfortable across frontend, backend, and relational data.' },
      { t: 'Strong fundamentals',       d: 'Data structures, algorithms, and clean architecture.' },
      { t: 'Leadership track record',   d: 'Music direction, public speaking, team coordination.' },
    ],
  },

  es: {
    identity: {
      name: 'Alexander D. Ball',
      logo: '</Alex-Ball\\>',
      title: 'Ingeniero de Software',
      statement: 'Construyendo software moderno con claridad, confiabilidad y propósito.',
      location: 'Estados Unidos',
      availability: 'Disponible para roles de Ingeniería de Software',
      email: 'contact@alexball.dev',
      linkedin: 'https://www.linkedin.com/in/alexball03/',
      github: 'https://github.com/AlexBall03',
      githubHandle: 'AlexBall03',
      resume: '/assets/Alexander-Ball-Resume.pdf',
    },
    snapshot: [
      { icon: 'cap',    value: 50, suffix: '%', label: 'Avance de la Licenciatura', note: 'Ciencias de la Computación' },
      { icon: 'code',   value: 1,  suffix: '+', label: 'Años Programando',          note: 'y contando' },
      { icon: 'cube',   value: 12, suffix: '',  label: 'Proyectos Creados',          note: 'y creciendo', gold: true },
      { icon: 'layers', value: 9,  suffix: '',  label: 'Tecnologías Utilizadas',     note: 'stack principal' },
    ],
    projects: [],
    archive: [
      { n: '04', name: 'Portfolio Engine', desc: 'Generador de sitio estático para este mismo sitio',    tags: ['JS', 'CSS'] },
      { n: '05', name: 'Query Lab',        desc: 'Práctica de SQL y sandbox de visualización',           tags: ['Oracle SQL', 'JS'] },
      { n: '06', name: 'TaskBoard',        desc: 'Tablero Kanban con persistencia de arrastrar y soltar', tags: ['.NET', 'jQuery'] },
    ],
    career: [
      {
        date: '2025 — Presente', role: 'Ingeniero de Software', org: 'Empresa de Ejemplo', current: true,
        blurb: 'Reemplaza con tu rol de ingeniería actual o más reciente — qué construyes, el stack y el impacto.',
        tags: ['C#', '.NET', 'SQL Server'],
      },
      {
        date: '2024 — 2025', role: 'Desarrollador de Software (Estudiante)', org: 'Organización de Ejemplo',
        blurb: 'Un rol anterior, pasantía o proyecto independiente. Manténlo en una línea clara de resultado.',
        tags: ['JavaScript', 'Bootstrap'],
      },
      {
        date: '2023 — 2024', role: 'Técnico de TI / Soporte', org: 'Ejemplo',
        blurb: 'Experiencia previa que formó tu base técnica y profesionalismo.',
        tags: ['Resolución de problemas'],
      },
    ],
    education: [
      {
        date: '2024 — Presente', role: 'Licenciatura en Ciencias de la Computación', org: 'Universidad de Ejemplo', current: true,
        blurb: 'En progreso — 50% completado. Agrega tu concentración y cursos destacados.',
        tags: ['Algoritmos', 'Bases de Datos', 'Ing. de Software'],
      },
      {
        date: '2023', role: 'Asociado / Fundamentos', org: 'Colegio de Ejemplo',
        blurb: 'Curso o programa previo que dio inicio al camino. Reemplaza con detalles reales.',
        tags: ['Fundamentos de CS'],
      },
      {
        date: 'En curso', role: 'Certificaciones', org: 'Autodirigido',
        blurb: 'Enumera certificaciones o rutas de aprendizaje relevantes aquí (p. ej. Azure, SQL, .NET).',
        tags: ['En progreso'],
      },
    ],
    stack: [
      { cat: 'Frontend', icon: 'code',     skills: ['HTML', 'CSS', 'JavaScript', 'Bootstrap', 'jQuery'] },
      { cat: 'Backend',  icon: 'server',   skills: ['C#', '.NET'] },
      { cat: 'Datos',    icon: 'database', gold: true, skills: ['Microsoft SQL Server', 'Oracle SQL'] },
    ],
    learning: ['Docker', 'CI/CD', 'Azure', 'Linux', 'Kubernetes'],
    roles: [
      { t: 'Ingeniero de Software', gold: false },
      { t: 'Director Musical',      gold: true  },
      { t: 'Orador Público',        gold: false },
      { t: 'Aprendiz de por Vida',  gold: true  },
    ],
    about: [
      'Construyo software moderno con énfasis en claridad, confiabilidad y mantenibilidad. Mi trayectoria combina ingeniería práctica con liderazgo — y aplico la misma disciplina al código que aplico al dirigir un equipo.',
      'Actualmente curso una Licenciatura en Ciencias de la Computación, y me importa construir sistemas bien estructurados, bien probados y hechos para durar.',
    ],
    differentiators: [
      { icon: 'music',     t: 'Liderazgo musical',       d: 'Años dirigiendo equipos — coordinación bajo presión.' },
      { icon: 'mic',       t: 'Oratoria',                 d: 'Cómodo presentando ante audiencias técnicas y no técnicas.' },
      { icon: 'languages', t: 'Intereses multilingües',   d: 'Estudiando activamente idiomas adicionales.' },
      { icon: 'globe',     t: 'Experiencia internacional', d: 'Viajes y misiones a través de distintas culturas.' },
      { icon: 'cap',       t: 'Cursos futuros',           d: 'Planeo estudiar DevOps e infraestructura en la nube más adelante en mi carrera.' },
    ],
    resumeHighlights: [
      { t: 'Capacidad full-stack',      d: 'Cómodo en frontend, backend y datos relacionales.' },
      { t: 'Fundamentos sólidos',       d: 'Estructuras de datos, algoritmos y arquitectura limpia.' },
      { t: 'Trayectoria de liderazgo',  d: 'Dirección musical, oratoria, coordinación de equipos.' },
    ],
  },
};
