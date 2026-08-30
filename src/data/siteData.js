// All site content, per locale.
// Edit the `en` block for your real content, then mirror changes to `es`.
export const DATA_ALL = {
  en: {
    identity: {
      name: 'Alexander D. Ball',
      logo: '</Alex-Ball\\>',
      title: 'Software Engineer',
      statement: 'Software engineer focused on full-stack development, backend systems, and DevOps.',
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
      { t: 'DevOps Enthusiast',      gold: false  },
    ],
    about: [
      "I'm a software developer working primarily with JavaScript, C#/.NET, and SQL. I enjoy full-stack development, and I'm especially interested in backend systems, DevOps, and the infrastructure behind reliable software.",
      "I'm currently working toward my B.S. in Software Engineering at Western Governors University. Outside of development, I'm also a music director and public speaker, which has given me a lot of hands-on experience with leadership, communication, and working with people.",
    ],
    differentiators: [
      { icon: 'music',     t: 'Music Direction',          d: 'Leading musicians has taught me a lot about communication, preparation, and coordinating a team.' },
      { icon: 'mic',       t: 'Public Speaking',          d: 'Regular public speaking has made me comfortable explaining ideas clearly in front of a room.' },
      { icon: 'languages', t: 'Languages',                d: 'Native English speaker, actively learning Spanish and Portuguese.' },
      { icon: 'globe',     t: 'International Experience', d: 'Mission work and travel have given me experience communicating and working across different cultures.' },
      { icon: 'cap',       t: 'DevOps & Cloud',           d: 'Currently expanding into CI/CD, Linux, containers, cloud infrastructure, and Kubernetes.' },
    ],
    resumeHighlights: [
      { t: 'Production Development',         d: 'JavaScript/jQuery, C#/.NET, and relational databases.' },
      { t: 'Software Engineering at WGU',    d: 'B.S. in Software Engineering with a Java emphasis, currently in progress.' },
      { t: 'Leadership & Communication',     d: 'Music direction, public speaking, and team coordination.' },
    ],
  },

  es: {
    identity: {
      name: 'Alexander D. Ball',
      logo: '</Alex-Ball\\>',
      title: 'Ingeniero de Software',
      statement: 'Ingeniero de software enfocado en desarrollo full-stack, sistemas backend y DevOps.',
      location: 'Arizona, EE. UU.',
      availability: 'Disponible para roles de Ingeniería de Software',
      email: 'contact@alexball.dev',
      linkedin: 'https://www.linkedin.com/in/alexball03/',
      github: 'https://github.com/AlexBall03',
      githubHandle: 'AlexBall03',
      resume: '/assets/Alexander-Ball-Resume.pdf',
    },
    snapshot: [
      { icon: 'cap',    value: 50, suffix: '%', label: 'Avance de la Licenciatura', note: 'Ingeniería de Software' },
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
        date: 'Marzo 2026 — Presente', role: 'Desarrollador de Software Junior', org: 'ENSYTE Energy Software International', current: true,
        blurb: 'Reemplaza con tu rol de ingeniería actual o más reciente — qué construyes, el stack y el impacto.',
        tags: ['HTML', 'CSS', 'JavaScript', 'jQuery', 'Angular', 'C#/.NET', 'Oracle/SQL Server'],
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
        date: '2024 — Presente', role: 'Licenciatura en Ingeniería de Software', org: 'Western Governors University', current: true,
        blurb: 'En curso — ~50% completado. Énfasis en Java.',
        tags: ['Algoritmos', 'Bases de Datos', 'Ingeniería de Software', 'Desarrollo Web', 'Estructuras de Datos', 'Java'],
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
      { t: 'Ingeniero de Software',        gold: false },
      { t: 'Director Musical',             gold: true  },
      { t: 'Orador Público',               gold: false },
      { t: 'Entusiasta de la Meteorología', gold: true  },
      { t: 'Entusiasta de DevOps',         gold: false },
    ],
    about: [
      'Soy desarrollador de software y trabajo principalmente con JavaScript, C#/.NET y SQL. Disfruto el desarrollo full-stack, y me interesan especialmente los sistemas backend, DevOps y la infraestructura detrás del software confiable.',
      'Actualmente estoy cursando mi licenciatura en Ingeniería de Software en Western Governors University. Fuera del desarrollo, también soy director musical y orador, lo cual me ha dado mucha experiencia práctica en liderazgo, comunicación y trabajo en equipo.',
    ],
    differentiators: [
      { icon: 'music',     t: 'Dirección Musical',         d: 'Dirigir músicos me ha enseñado mucho sobre comunicación, preparación y coordinar a un equipo.' },
      { icon: 'mic',       t: 'Oratoria',                  d: 'Hablar en público con frecuencia me ha hecho sentir cómodo explicando ideas con claridad frente a una sala.' },
      { icon: 'languages', t: 'Idiomas',                   d: 'Hablo inglés como lengua materna y estoy aprendiendo español y portugués.' },
      { icon: 'globe',     t: 'Experiencia Internacional', d: 'El trabajo misionero y los viajes me han dado experiencia comunicándome y trabajando entre culturas distintas.' },
      { icon: 'cap',       t: 'DevOps y Cloud',            d: 'Actualmente me estoy adentrando en CI/CD, Linux, contenedores, infraestructura cloud y Kubernetes.' },
    ],
    resumeHighlights: [
      { t: 'Desarrollo en Producción',      d: 'JavaScript/jQuery, C#/.NET y bases de datos relacionales.' },
      { t: 'Ingeniería de Software en WGU', d: 'Licenciatura en Ingeniería de Software con énfasis en Java, actualmente en curso.' },
      { t: 'Liderazgo y Comunicación',      d: 'Dirección musical, oratoria y coordinación de equipos.' },
    ],
  },
};
