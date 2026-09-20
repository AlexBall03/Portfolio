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
      { icon: 'cap',    value: 60, suffix: '%', label: 'Degree Progress',      note: 'B.S. → M.S. Software Engineering' },
      { icon: 'code',   value: 2,  suffix: '+', label: 'Years Programming',    note: 'and counting' },
      { icon: 'cube',   value: 12, suffix: '',  label: 'Projects Built',       note: 'and growing', gold: true }, // TODO confirm count
      { icon: 'layers', value: 10, suffix: '',  label: 'Technologies Used',    note: 'core stack' },
    ],
    projects: [
      {
        n: '01',
        name: 'Weather',
        tagline: 'NWS-powered weather command center',
        live: true,
        desc: 'A responsive weather dashboard built around National Weather Service data, with current observations, active alerts, hourly and seven-day forecasts, and Simple/Advanced modes. The app normalizes multiple NWS sources behind a resilient server-side data layer with caching, geolocation, and Mapbox-powered location search.',
        stack: ['Next.js', 'TypeScript', 'React', 'NWS API', 'Mapbox', 'Vercel'],
        links: {
          demo: 'https://weather.alexball.dev',
          source: 'https://github.com/AlexBall03/Weather',
          study: 'https://github.com/AlexBall03/Weather/blob/master/README.md',
        },
      },
      {
        n: '02',
        name: 'Portfolio Website',
        tagline: 'A software engineering portfolio built like a product',
        live: true,
        desc: 'A bilingual engineering portfolio built from scratch with React and Vite, featuring routed pages, a command palette, live GitHub activity, persistent theme and language preferences, contact delivery, SEO, structured data, and a companion API portal backed by Vercel serverless functions.',
        stack: ['React', 'Vite', 'JavaScript', 'React Router', 'Vercel', 'GitHub API'],
        links: {
          demo: 'https://alexball.dev',
          source: 'https://github.com/AlexBall03/Portfolio',
          study: 'https://github.com/AlexBall03/Portfolio/blob/master/README.md',
        },
      },
    ],
    archive: [],
    career: [
      {
        date: 'March 2026 — Present', role: 'Junior Software Developer', org: 'ENSYTE Energy Software International', type: 'Full-time', location: 'Houston, Texas · Remote', current: true,
        blurb: [
          "Contribute to the development and modernization of legacy desktop and web applications into a modern, web-based SaaS platform using C#/.NET, JavaScript (jQuery & React), HTML, CSS (Bootstrap), and SQL across Oracle and Microsoft SQL Server.",
          "Work across the full stack on new features, bug fixes, reporting, database-backed functionality, and legacy-system migration, with a strong focus on debugging, root-cause analysis, testing, and validation across multiple customer environments.",
          "Leverage AI-assisted development tools, including Claude Code, to accelerate implementation, investigation, and debugging while reviewing and validating changes through testing, database verification, and code review."
        ],
        tags: ['HTML', 'CSS', 'JavaScript', 'jQuery', 'React', 'C#/.NET', 'SQL (Oracle/SQL Server)'],
      },
      {
        date: 'March 2025 — March 2026', role: 'Test Engineering Technician', org: 'DS Electronics', type: 'Full-time', location: 'Gilbert, Arizona · On-site',
        blurb: [
          "Responsibilities include, but are not limited to, PCB testing, assembly, and depaneling as part of the electronics production process.",
          "All testing, assembly, and inspection is performed in accordance with ISO 9001 quality management standards."
        ],
        tags: ['Programming', 'Communication', 'Attention to Detail', 'Problem Solving', 'Troubleshooting', 'Teamwork', 'PCB Testing', 'ISO 9001'],
      },
      {
        date: 'May 2023 — March 2025', role: 'Fiber Optic Assembler', org: 'Optilab LLC', type: 'Full-time', location: 'Phoenix, Arizona · On-site',
        blurb: [
          "Tested fiber optic devices, modules, benchtops, and rackmounts, and performed single-mode, multi-mode, and polarization-maintaining fiber splicing, soldering, and precision assembly and fiber alignment of PD, PR, and BPR devices.",
          "Assisted engineers with assembly and testing for R&D work, and prepared and packaged finished products for customer orders."
        ],
        tags: ['Fiber Optics', 'Splicing (SM/MM/PM)', 'Soldering', 'Optical Alignment', 'Device Testing', 'R&D Support', 'Attention to Detail'],
      },
      {
        date: 'Aug 2022 — May 2023', role: 'Layoff/position eliminated', org: 'Career break', location: 'Gilbert, Arizona',
        blurb: [
          "My position was eliminated due to organizational restructuring.",
        ],
      },
      {
        date: 'March 2022 — Aug 2022', role: 'Manufacturing Shop Assistant', org: 'VirTra', type: 'Full-time', location: 'Chandler, Arizona · On-site',
        blurb: [
          "Operated and maintained machine shop equipment, handling daily machine warmup and upkeep, laser cutting and engraving, sand blasting, and deburring of mechanical parts.",
          "Inspected mechanical parts for quality, picked material for the machine shop and assembly floor, and managed shipping and receiving for the shop."
        ],
        tags: ['Machine Operation', 'Laser Cutting & Engraving', 'Sand Blasting', 'Deburring', 'Parts Inspection', 'Shipping & Receiving', 'Attention to Detail'],
      },
      {
        date: 'Aug 2021 — March 2022', role: 'Mechanical Assembly Technician', org: 'VirTra', type: 'Full-time', location: 'Tempe, Arizona · On-site',
        blurb: [
          "Assembled and troubleshot mechanical parts as part of the production process, and assisted with inspection to verify parts met specification before final assembly.",
          "Also performed laser cutting and engraving, and supported material picking and inventory for both the assembly floor and the machine shop."
        ],
        tags: ['Mechanical Assembly', 'Troubleshooting', 'Parts Inspection', 'Laser Cutting & Engraving', 'Inventory & Material Picking', 'Teamwork', 'Attention to Detail'],
      },
    ],
    education: [
      {
        date: 'Feb 2024 — Feb 2028', role: 'B.S. Software Engineering', org: 'Western Governors University', type: 'Accelerated B.S. → M.S.', current: true,
        blurb: [
          "As of August 2026, I moved into WGU's Accelerated Software Engineering program, which combines the Bachelor's and Master's degrees into a single track (B.S. → M.S.).",
          "Undergraduate emphasis in Java, graduate emphasis in DevOps Engineering. Current GPA: 3.0 (WGU)."
        ],
        tags: ['Software Engineering', 'Algorithms', 'Data Structures', 'Databases', 'Web Development', 'Java', 'DevOps'],
      },
      {
        date: '2017 — 2021', role: 'High School Diploma', org: 'Homeschool',
        blurb: [
          "Completed a homeschool curriculum and graduated with a 4.0 GPA."
        ],
      },
    ],
    stack: [
      { cat: 'Frontend', icon: 'code',     skills: ['HTML', 'CSS', 'Bootstrap', 'JavaScript', 'TypeScript', 'React.js', 'Next.js', 'jQuery'] },
      { cat: 'Backend',  icon: 'server',   skills: ['C#', '.NET'] },
      { cat: 'Data',     icon: 'database', gold: true, skills: ['Microsoft SQL Server', 'Oracle SQL'] },
    ],
    learning: ['Docker', 'CI/CD', 'Azure', 'Linux', 'Kubernetes'],
    roles: [
      { t: 'Software Engineer',      gold: false  },
      { t: 'Music Director',         gold: true   },
      { t: 'Public Speaker',         gold: false  },
      { t: 'Language Learner',       gold: true  },
      { t: 'Meteorology Enthusiast', gold: false   },
      { t: 'DevOps Enthusiast',      gold: true  },
    ],
    about: [
      "I’m a full-stack software engineer working on the migration of a legacy desktop application into a modern, cloud-hosted SaaS platform. I focus on reliable, scalable systems and practical improvements to software people actually use.",
      "I work with HTML, CSS, JavaScript/TypeScript, React/Next.js, C#/.NET, and SQL. I care about clean, maintainable code and understanding a system end to end, from the interface down to the database.",
      "I’m pursuing a B.S. and M.S. in Software Engineering — the undergraduate degree with a Java emphasis, the graduate degree with a DevOps emphasis.",
      "Outside of engineering, I serve as Music Director and Audio Engineer at my local church, leading music operations and handling recording and production. It has sharpened my leadership, organization, and ability to work with a team under pressure.",
      "I’m also learning Spanish and follow meteorology and severe weather closely.",
      "I enjoy hard problems, learning fast, and shipping work that has real impact."
    ],
    differentiators: [
      { icon: 'music',     t: 'Music Direction',          d: 'Leading musicians has taught me a lot about communication, preparation, and coordinating a team.' },
      { icon: 'mic',       t: 'Public Speaking',          d: 'Regular public speaking has made me comfortable explaining ideas clearly in front of a room.' },
      { icon: 'languages', t: 'Languages',                d: 'Native English speaker, actively learning Spanish and will also be pursuing Portuguese, Greek, and an undecided Asian Language.' },
      { icon: 'globe',     t: 'International Experience', d: 'Mission work and travel have given me experience communicating and working across different cultures throughout the world, including the Americas and Africa.' },
      { icon: 'cloudSun',  t: 'Meteorology',              d: 'A long-standing interest in weather — tracking storm systems and reading forecast model data keeps me sharp at interpreting messy, real-world data.' },
      { icon: 'cap',       t: 'DevOps & Cloud',           d: 'Currently expanding into CI/CD, Linux, containers, cloud infrastructure, and Kubernetes.' },
    ],
    resumeHighlights: [
      { t: 'Production Development',         d: 'JavaScript/TypeScript, React/Next.js, jQuery, C#/.NET, and relational databases.' },
      { t: 'Software Engineering at WGU',    d: 'Accelerated B.S. and M.S. in Software Engineering, with Java and DevOps emphases — in progress.' },
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
      { icon: 'cap',    value: 50, suffix: '%', label: 'Avance del Programa',       note: 'Lic. → Maestría en Ingeniería de Software' },
      { icon: 'code',   value: 2,  suffix: '+', label: 'Años Programando',          note: 'y contando' },
      { icon: 'cube',   value: 12, suffix: '',  label: 'Proyectos Creados',          note: 'y creciendo', gold: true },
      { icon: 'layers', value: 10, suffix: '',  label: 'Tecnologías Utilizadas',     note: 'stack principal' },
    ],
    projects: [
      {
        n: '01',
        name: 'Weather',
        tagline: 'Centro meteorológico impulsado por datos del NWS',
        live: true,
        desc: 'Un panel meteorológico responsivo construido sobre datos del Servicio Meteorológico Nacional de EE. UU. (NWS), con observaciones actuales, alertas activas, pronósticos por hora y de siete días, y modos Simple/Avanzado. La aplicación normaliza múltiples fuentes del NWS mediante una capa de datos del servidor con caché, geolocalización y búsqueda de ubicaciones con Mapbox.',
        stack: ['Next.js', 'TypeScript', 'React', 'NWS API', 'Mapbox', 'Vercel'],
        links: {
          demo: 'https://weather.alexball.dev',
          source: 'https://github.com/AlexBall03/Weather',
          study: 'https://github.com/AlexBall03/Weather/blob/master/README.md',
        },
      },
      {
        n: '02',
        name: 'Sitio Web de Portafolio',
        tagline: 'Un portafolio de ingeniería de software construido como producto',
        live: true,
        desc: 'Un portafolio de ingeniería bilingüe construido desde cero con React y Vite, con páginas enrutadas, paleta de comandos, actividad de GitHub en vivo, preferencias persistentes de tema e idioma, formulario de contacto, SEO, datos estructurados y un portal de API respaldado por funciones serverless de Vercel.',
        stack: ['React', 'Vite', 'JavaScript', 'React Router', 'Vercel', 'GitHub API'],
        links: {
          demo: 'https://alexball.dev',
          source: 'https://github.com/AlexBall03/Portfolio',
          study: 'https://github.com/AlexBall03/Portfolio/blob/master/README.md',
        },
      },
    ],
    archive: [],
    career: [
      {
        date: 'Marzo 2026 — Presente', role: 'Desarrollador de Software Junior', org: 'ENSYTE Energy Software International', type: 'Tiempo Completo', location: 'Houston, Texas · Remoto', current: true,
        blurb: [
          'Contribuyo al desarrollo y la modernización de aplicaciones heredadas de escritorio y web hacia una plataforma SaaS moderna basada en la web, usando C#/.NET, JavaScript (jQuery y React), HTML, CSS (Bootstrap) y SQL en Oracle y Microsoft SQL Server.',
          'Trabajo en todo el stack en nuevas funcionalidades, corrección de errores, reportes, funcionalidad respaldada por bases de datos y migración de sistemas heredados, con un fuerte enfoque en la depuración, el análisis de causa raíz, las pruebas y la validación en múltiples entornos de clientes.',
          'Utilizo herramientas de desarrollo asistido por IA, incluido Claude Code, para acelerar la implementación, la investigación y la depuración, revisando y validando los cambios mediante pruebas, verificación en base de datos y revisión de código.'
        ],
        tags: ['HTML', 'CSS', 'JavaScript', 'jQuery', 'React', 'C#/.NET', 'SQL (Oracle/SQL Server)'],
      },
      {
        date: 'Marzo 2025 — Marzo 2026', role: 'Técnico de Ingeniería de Pruebas', org: 'DS Electronics', type: 'Tiempo Completo', location: 'Gilbert, Arizona · Presencial',
        blurb: [
          'Mis responsabilidades incluyen, entre otras, pruebas, ensamblaje y despaneleado de placas de circuito impreso (PCB) dentro del proceso de producción electrónica.',
          'Todas las pruebas, el ensamblaje y la inspección se realizan conforme a los estándares de gestión de calidad ISO 9001.'
        ],
        tags: ['Programación', 'Comunicación', 'Atención al Detalle', 'Resolución de Problemas', 'Diagnóstico', 'Trabajo en Equipo', 'Pruebas de PCB', 'ISO 9001'],
      },
      {
        date: 'Mayo 2023 — Marzo 2025', role: 'Ensamblador de Fibra Óptica', org: 'Optilab LLC', type: 'Tiempo Completo', location: 'Phoenix, Arizona · Presencial',
        blurb: [
          'Realicé pruebas de dispositivos, módulos, equipos de banco y montajes en rack de fibra óptica, además de empalmes de fibra monomodo, multimodo y de mantenimiento de polarización, soldadura y el ensamblaje y alineación de precisión de dispositivos PD, PR y BPR.',
          'Apoyé a los ingenieros en el ensamblaje y las pruebas de proyectos de I+D, y preparé y empaqué productos terminados para pedidos de clientes.'
        ],
        tags: ['Fibra Óptica', 'Empalmes (SM/MM/PM)', 'Soldadura', 'Alineación Óptica', 'Pruebas de Dispositivos', 'Apoyo en I+D', 'Atención al Detalle'],
      },
      {
        date: 'Agosto 2022 — Mayo 2023', role: 'Puesto eliminado', org: 'Pausa profesional', location: 'Gilbert, Arizona',
        blurb: [
          'Mi puesto fue eliminado debido a una reestructuración organizacional.',
        ],
      },
      {
        date: 'Marzo 2022 — Agosto 2022', role: 'Asistente de Taller de Manufactura', org: 'VirTra', type: 'Tiempo Completo', location: 'Chandler, Arizona · Presencial',
        blurb: [
          'Operé y mantuve equipos del taller de máquinas, encargándome del calentamiento y mantenimiento diario de las máquinas, el corte y grabado láser, el chorro de arena y el desbarbado de piezas mecánicas.',
          'Inspeccioné piezas mecánicas para control de calidad, preparé material para el taller y la línea de ensamblaje, y gestioné los envíos y recepciones del taller.'
        ],
        tags: ['Operación de Máquinas', 'Corte y Grabado Láser', 'Chorro de Arena', 'Desbarbado', 'Inspección de Piezas', 'Envíos y Recepción', 'Atención al Detalle'],
      },
      {
        date: 'Agosto 2021 — Marzo 2022', role: 'Técnico de Ensamblaje Mecánico', org: 'VirTra', type: 'Tiempo Completo', location: 'Tempe, Arizona · Presencial',
        blurb: [
          'Ensamblé y diagnostiqué piezas mecánicas dentro del proceso de producción, y apoyé en la inspección para verificar que cumplieran las especificaciones antes del ensamblaje final.',
          'También realicé corte y grabado láser, y apoyé en la preparación de material y el control de inventario para la línea de ensamblaje y el taller de máquinas.'
        ],
        tags: ['Ensamblaje Mecánico', 'Resolución de Problemas', 'Inspección de Piezas', 'Corte y Grabado Láser', 'Inventario y Material', 'Trabajo en Equipo', 'Atención al Detalle'],
      },
    ],
    education: [
      {
        date: 'Feb 2024 — Feb 2028', role: 'Licenciatura en Ingeniería de Software', org: 'Western Governors University', type: 'Acelerado Lic. → Maestría', current: true,
        blurb: [
          'Desde agosto de 2026 formo parte del programa acelerado de Ingeniería de Software de WGU, que combina la licenciatura y la maestría en un solo plan de estudios (Lic. → Maestría).',
          'Énfasis en Java en la licenciatura y en Ingeniería DevOps en la maestría. Promedio actual: 3.0.'
        ],
        tags: ['Ingeniería de Software', 'Algoritmos', 'Estructuras de Datos', 'Bases de Datos', 'Desarrollo Web', 'Java', 'DevOps'],
      },
      {
        date: '2017 — 2021', role: 'Diploma de Preparatoria', org: 'Educación en Casa',
        blurb: [
          'Completé un plan de estudios de educación en casa y me gradué con un promedio de 4.0.'
        ],
      },
    ],
    stack: [
      { cat: 'Frontend', icon: 'code',     skills: ['HTML', 'CSS', 'JavaScript', 'Bootstrap', 'jQuery', 'React'] },
      { cat: 'Backend',  icon: 'server',   skills: ['C#', '.NET'] },
      { cat: 'Datos',    icon: 'database', gold: true, skills: ['Microsoft SQL Server', 'Oracle SQL'] },
    ],
    learning: ['Docker', 'CI/CD', 'Azure', 'Linux', 'Kubernetes'],
    roles: [
      { t: 'Ingeniero de Software',         gold: false },
      { t: 'Director Musical',              gold: true  },
      { t: 'Orador Público',                gold: false },
      { t: 'Estudiante de Idiomas',         gold: true  },
      { t: 'Entusiasta de la Meteorología', gold: false },
      { t: 'Entusiasta de DevOps',          gold: true  },
    ],
    about: [
      'Soy ingeniero de software full-stack y trabajo en la migración de una aplicación de escritorio heredada hacia una plataforma SaaS moderna alojada en la nube. Me enfoco en sistemas confiables y escalables, y en mejoras prácticas al software que la gente realmente usa.',
      'Trabajo con HTML, CSS, JavaScript, C#/.NET y SQL. Me importa escribir código limpio y mantenible, y entender el sistema de principio a fin, desde la interfaz hasta la base de datos.',
      'Estoy cursando una licenciatura y una maestría en Ingeniería de Software: la licenciatura con énfasis en Java y la maestría con énfasis en DevOps.',
      'Fuera de la ingeniería, soy Director Musical e Ingeniero de Audio en mi iglesia local, donde dirijo las operaciones musicales y me encargo de la grabación y la producción. Eso ha fortalecido mi liderazgo, mi organización y mi capacidad de trabajar en equipo bajo presión.',
      'También estoy aprendiendo español y sigo de cerca la meteorología y el clima severo.',
      'Disfruto los problemas difíciles, aprender rápido y entregar trabajo que tenga un impacto real.'
    ],
    differentiators: [
      { icon: 'music',     t: 'Dirección Musical',         d: 'Dirigir músicos me ha enseñado mucho sobre comunicación, preparación y coordinar a un equipo.' },
      { icon: 'mic',       t: 'Oratoria',                  d: 'Hablar en público con frecuencia me ha hecho sentir cómodo explicando ideas con claridad frente a una sala.' },
      { icon: 'languages', t: 'Idiomas',                   d: 'Hablante nativo de inglés, aprendiendo español activamente, y con planes de estudiar portugués, griego y un idioma asiático por definir.' },
      { icon: 'globe',     t: 'Experiencia Internacional', d: 'El trabajo misionero y los viajes me han dado experiencia comunicándome y trabajando entre culturas distintas alrededor del mundo, incluyendo América y África.' },
      { icon: 'cloudSun',  t: 'Meteorología',              d: 'Un interés de siempre por el clima: seguir sistemas de tormentas e interpretar datos de modelos de pronóstico me mantiene ágil al analizar datos reales y desordenados.' },
      { icon: 'cap',       t: 'DevOps y Cloud',            d: 'Actualmente me estoy adentrando en CI/CD, Linux, contenedores, infraestructura cloud y Kubernetes.' },
    ],
    resumeHighlights: [
      { t: 'Desarrollo en Producción',      d: 'JavaScript/jQuery, React, C#/.NET y bases de datos relacionales.' },
      { t: 'Ingeniería de Software en WGU', d: 'Licenciatura y maestría en Ingeniería de Software, con énfasis en Java y DevOps, actualmente en curso.' },
      { t: 'Liderazgo y Comunicación',      d: 'Dirección musical, oratoria y coordinación de equipos.' },
    ],
  },
};
