import type { z } from 'zod';
import type { contentSeedSchema } from './schema';

/**
 * Initial portfolio content, migrated from the pre-Next.js site
 * (src/data/siteData.js + siteStrings.js). Language-neutral facts are stated
 * once; where the old English and Spanish copies had drifted, English was
 * treated as canonical and the Spanish brought up to date.
 *
 * This bootstraps an empty database. After that, the database is the source
 * of truth — edit content there (Admin, Phase 4), not here.
 */
export const content: z.input<typeof contentSeedSchema> = {
  settings: {
    brandMark: '</Alex-Ball\\>',
    monogram: '</AB\\>',
    githubUsername: 'AlexBall03',
    showGithubSection: true,
    defaultTheme: 'dark',
  },

  profile: {
    fullName: 'Alexander D. Ball',
    shortName: 'Alex Ball',
    email: 'contact@alexball.dev',
    openToWork: true,
    timeZone: 'America/Phoenix',
    addressRegion: 'Arizona',
    addressCountry: 'US',
    headshot: {
      storage: 'static',
      src: '/assets/headshot.png',
      // The file is a JPEG despite its extension; next/image serves it correctly.
      mimeType: 'image/jpeg',
      width: 1254,
      height: 1254,
      alt: { en: 'Alexander D. Ball', es: 'Alexander D. Ball' },
    },
    resume: {
      storage: 'static',
      src: '/assets/Alexander-Ball-Resume.pdf',
      mimeType: 'application/pdf',
      alt: { en: 'Alexander D. Ball — Resume (PDF)', es: 'Alexander D. Ball — Currículum (PDF)' },
    },
    translations: {
      en: {
        title: 'Software Engineer',
        statement: 'Software engineer focused on full-stack development, backend systems, and DevOps.',
        availabilityText: 'Open to Software Engineering roles',
        locationLabel: 'Arizona, USA',
        about: [
          'I’m a full-stack software engineer working on the migration of a legacy desktop application into a modern, cloud-hosted SaaS platform. I focus on reliable, scalable systems and practical improvements to software people actually use.',
          'I work with HTML, CSS, JavaScript/TypeScript, React/Next.js, C#/.NET, and SQL. I care about clean, maintainable code and understanding a system end to end, from the interface down to the database.',
          'I’m pursuing a B.S. and M.S. in Software Engineering — the undergraduate degree with a Java emphasis, the graduate degree with a DevOps emphasis.',
          'Outside of engineering, I serve as Music Director and Audio Engineer at my local church, leading music operations and handling recording and production. It has sharpened my leadership, organization, and ability to work with a team under pressure.',
          'I’m also learning Spanish and follow meteorology and severe weather closely.',
          'I enjoy hard problems, learning fast, and shipping work that has real impact.',
        ],
        heroFocus: 'Full-Stack Development',
        heroStackLine: 'TypeScript · Next.js · Java · SQL',
        heroChips: ['Full-Stack Developer', 'Building & Learning'],
      },
      es: {
        title: 'Ingeniero de Software',
        statement: 'Ingeniero de software enfocado en desarrollo full-stack, sistemas backend y DevOps.',
        availabilityText: 'Disponible para roles de Ingeniería de Software',
        locationLabel: 'Arizona, EE. UU.',
        about: [
          'Soy ingeniero de software full-stack y trabajo en la migración de una aplicación de escritorio heredada hacia una plataforma SaaS moderna alojada en la nube. Me enfoco en sistemas confiables y escalables, y en mejoras prácticas al software que la gente realmente usa.',
          'Trabajo con HTML, CSS, JavaScript/TypeScript, React/Next.js, C#/.NET y SQL. Me importa escribir código limpio y mantenible, y entender el sistema de principio a fin, desde la interfaz hasta la base de datos.',
          'Estoy cursando una licenciatura y una maestría en Ingeniería de Software: la licenciatura con énfasis en Java y la maestría con énfasis en DevOps.',
          'Fuera de la ingeniería, soy Director Musical e Ingeniero de Audio en mi iglesia local, donde dirijo las operaciones musicales y me encargo de la grabación y la producción. Eso ha fortalecido mi liderazgo, mi organización y mi capacidad de trabajar en equipo bajo presión.',
          'También estoy aprendiendo español y sigo de cerca la meteorología y el clima severo.',
          'Disfruto los problemas difíciles, aprender rápido y entregar trabajo que tenga un impacto real.',
        ],
        heroFocus: 'Desarrollo Full-Stack',
        heroStackLine: 'TypeScript · Next.js · Java · SQL',
        heroChips: ['Desarrollador Full-Stack', 'Construyendo y Aprendiendo'],
      },
    },
  },

  socialLinks: [
    { platform: 'github', label: 'GitHub', url: 'https://github.com/AlexBall03', handle: '@AlexBall03' },
    { platform: 'linkedin', label: 'LinkedIn', url: 'https://www.linkedin.com/in/alexball03/', handle: 'in/alexball03' },
  ],

  roles: [
    { accent: 'blue', translations: { en: { label: 'Software Engineer' }, es: { label: 'Ingeniero de Software' } } },
    { accent: 'gold', translations: { en: { label: 'Music Director' }, es: { label: 'Director Musical' } } },
    { accent: 'blue', translations: { en: { label: 'Public Speaker' }, es: { label: 'Orador Público' } } },
    { accent: 'gold', translations: { en: { label: 'Language Learner' }, es: { label: 'Estudiante de Idiomas' } } },
    { accent: 'blue', translations: { en: { label: 'Meteorology Enthusiast' }, es: { label: 'Entusiasta de la Meteorología' } } },
    { accent: 'gold', translations: { en: { label: 'DevOps Enthusiast' }, es: { label: 'Entusiasta de DevOps' } } },
  ],

  highlights: [
    {
      kind: 'differentiator',
      icon: 'music',
      translations: {
        en: { title: 'Music Direction', body: 'Leading musicians has taught me a lot about communication, preparation, and coordinating a team.' },
        es: { title: 'Dirección Musical', body: 'Dirigir músicos me ha enseñado mucho sobre comunicación, preparación y coordinar a un equipo.' },
      },
    },
    {
      kind: 'differentiator',
      icon: 'mic',
      translations: {
        en: { title: 'Public Speaking', body: 'Regular public speaking has made me comfortable explaining ideas clearly in front of a room.' },
        es: { title: 'Oratoria', body: 'Hablar en público con frecuencia me ha hecho sentir cómodo explicando ideas con claridad frente a una sala.' },
      },
    },
    {
      kind: 'differentiator',
      icon: 'languages',
      translations: {
        en: { title: 'Languages', body: 'Native English speaker, actively learning Spanish and will also be pursuing Portuguese, Greek, and an undecided Asian Language.' },
        es: { title: 'Idiomas', body: 'Hablante nativo de inglés, aprendiendo español activamente, y con planes de estudiar portugués, griego y un idioma asiático por definir.' },
      },
    },
    {
      kind: 'differentiator',
      icon: 'globe',
      translations: {
        en: { title: 'International Experience', body: 'Mission work and travel have given me experience communicating and working across different cultures throughout the world, including the Americas and Africa.' },
        es: { title: 'Experiencia Internacional', body: 'El trabajo misionero y los viajes me han dado experiencia comunicándome y trabajando entre culturas distintas alrededor del mundo, incluyendo América y África.' },
      },
    },
    {
      kind: 'differentiator',
      icon: 'cloudSun',
      translations: {
        en: { title: 'Meteorology', body: 'A long-standing interest in weather — tracking storm systems and reading forecast model data keeps me sharp at interpreting messy, real-world data.' },
        es: { title: 'Meteorología', body: 'Un interés de siempre por el clima: seguir sistemas de tormentas e interpretar datos de modelos de pronóstico me mantiene ágil al analizar datos reales y desordenados.' },
      },
    },
    {
      kind: 'differentiator',
      icon: 'cap',
      translations: {
        en: { title: 'DevOps & Cloud', body: 'Currently expanding into CI/CD, Linux, containers, cloud infrastructure, and Kubernetes.' },
        es: { title: 'DevOps y Cloud', body: 'Actualmente me estoy adentrando en CI/CD, Linux, contenedores, infraestructura cloud y Kubernetes.' },
      },
    },
    {
      kind: 'resume',
      icon: 'check',
      translations: {
        en: { title: 'Production Development', body: 'JavaScript/TypeScript, React/Next.js, jQuery, C#/.NET, and relational databases.' },
        es: { title: 'Desarrollo en Producción', body: 'JavaScript/TypeScript, React/Next.js, jQuery, C#/.NET y bases de datos relacionales.' },
      },
    },
    {
      kind: 'resume',
      icon: 'check',
      translations: {
        en: { title: 'Software Engineering at WGU', body: 'Accelerated B.S. and M.S. in Software Engineering, with Java and DevOps emphases — in progress.' },
        es: { title: 'Ingeniería de Software en WGU', body: 'Licenciatura y maestría aceleradas en Ingeniería de Software, con énfasis en Java y DevOps, actualmente en curso.' },
      },
    },
    {
      kind: 'resume',
      icon: 'check',
      translations: {
        en: { title: 'Leadership & Communication', body: 'Music direction, public speaking, and team coordination.' },
        es: { title: 'Liderazgo y Comunicación', body: 'Dirección musical, oratoria y coordinación de equipos.' },
      },
    },
  ],

  metrics: [
    {
      icon: 'cap',
      value: 60,
      suffix: '%',
      translations: {
        en: { label: 'Degree Progress', note: 'B.S. → M.S. Software Engineering' },
        es: { label: 'Avance del Programa', note: 'Lic. → Maestría en Ingeniería de Software' },
      },
    },
    {
      icon: 'code',
      value: 2,
      suffix: '+',
      translations: {
        en: { label: 'Years Programming', note: 'and counting' },
        es: { label: 'Años Programando', note: 'y contando' },
      },
    },
    {
      icon: 'cube',
      source: 'published_projects',
      value: 0,
      accent: 'gold',
      translations: {
        en: { label: 'Published Projects', note: 'in this portfolio' },
        es: { label: 'Proyectos Publicados', note: 'en este portafolio' },
      },
    },
    {
      icon: 'layers',
      source: 'technologies',
      value: 0,
      translations: {
        en: { label: 'Core Technologies', note: 'in my current stack' },
        es: { label: 'Tecnologías Principales', note: 'en mi stack actual' },
      },
    },
  ],

  pages: {
    home: {
      en: { seoDescription: 'Alexander D. Ball is a full-stack software engineer in Arizona working with TypeScript, React/Next.js, C#/.NET, and SQL, with a focus on backend systems and DevOps.' },
      es: { seoDescription: 'Alexander D. Ball es un ingeniero de software full-stack en Arizona que trabaja con TypeScript, React/Next.js, C#/.NET y SQL, con enfoque en sistemas backend y DevOps.' },
    },
    about: {
      en: { seoDescription: "More about my background, interests, leadership experience, and what I'm learning." },
      es: { seoDescription: 'Más sobre mi trayectoria, mis intereses, mi experiencia de liderazgo y lo que estoy aprendiendo.' },
    },
    projects: {
      en: { seoDescription: "Projects I've built, the technologies behind them, and my recent GitHub activity." },
      es: { seoDescription: 'Proyectos que he construido, las tecnologías detrás de ellos y mi actividad reciente en GitHub.' },
    },
    experience: {
      en: { seoDescription: 'My professional software development experience and education.' },
      es: { seoDescription: 'Mi experiencia profesional en desarrollo de software y mi formación académica.' },
    },
    resume: {
      en: { seoDescription: 'View or download my current software engineering resume.' },
      es: { seoDescription: 'Consulta o descarga mi currículum actual de ingeniería de software.' },
    },
    contact: {
      en: { seoDescription: 'Get in touch about software engineering opportunities, projects, or anything else.' },
      es: { seoDescription: 'Escríbeme sobre oportunidades en ingeniería de software, proyectos o cualquier otra cosa.' },
    },
  },

  sections: {
    snapshot: {
      en: { eyebrow: 'Technical Snapshot', title: "Where I'm at right now", subtitle: 'A quick snapshot of my degree progress, experience, projects, and stack.' },
      es: { eyebrow: 'Resumen Técnico', title: 'En qué punto estoy', subtitle: 'Un resumen rápido de mi avance en la carrera, mi experiencia, mis proyectos y mi stack.' },
    },
    about: {
      en: { eyebrow: 'About', title: 'A little more about me', subtitle: 'Software is what I do. These are some of the other things that shape how I work.', aside: 'Beyond the code' },
      es: { eyebrow: 'Acerca', title: 'Un poco más sobre mí', subtitle: 'El software es a lo que me dedico. Esto es parte de lo demás que influye en cómo trabajo.', aside: 'Más allá del código' },
    },
    stack: {
      en: { eyebrow: 'Technology Stack', title: 'Tools I reach for', subtitle: 'Languages, frameworks, and tools I currently work with.', aside: 'Looking Ahead' },
      es: { eyebrow: 'Stack Tecnológico', title: 'Herramientas que utilizo', subtitle: 'Lenguajes, frameworks y herramientas con los que trabajo actualmente.', aside: 'Mirando Hacia Adelante' },
    },
    projects: {
      en: { eyebrow: 'Featured Projects', title: "Things I'm proud of", subtitle: "A few projects I've built and what I learned from them." },
      es: { eyebrow: 'Proyectos Destacados', title: 'Cosas de las que estoy orgulloso', subtitle: 'Algunos proyectos que he construido y lo que aprendí de cada uno.' },
    },
    github: {
      en: { eyebrow: 'GitHub Activity', title: 'Recent GitHub Activity', subtitle: 'Recent repositories, contributions, and activity straight from GitHub.' },
      es: { eyebrow: 'Actividad en GitHub', title: 'Actividad Reciente en GitHub', subtitle: 'Repositorios, contribuciones y actividad reciente directo desde GitHub.' },
    },
    experience: {
      en: { eyebrow: 'Experience', title: 'Experience & Education', subtitle: "My professional software development experience so far, along with the degree I'm currently working on." },
      es: { eyebrow: 'Experiencia', title: 'Experiencia y Educación', subtitle: 'Mi experiencia profesional en desarrollo de software hasta ahora, junto con la carrera que estoy cursando.' },
    },
    resume: {
      en: { eyebrow: 'Resume', title: 'Resume', subtitle: 'View my current resume here or download a copy.' },
      es: { eyebrow: 'Currículum', title: 'Currículum', subtitle: 'Consulta aquí mi currículum actual o descarga una copia.' },
    },
    contact: {
      en: {
        eyebrow: 'Contact',
        title: "Let's talk.",
        body: "I'm currently open to software engineering opportunities, especially full-stack, backend, and DevOps-focused roles. If you're hiring, want to talk about my work, or just want to connect, send me a message.",
      },
      es: {
        eyebrow: 'Contacto',
        title: 'Hablemos.',
        body: 'Estoy abierto a oportunidades en ingeniería de software, sobre todo en roles enfocados en full-stack, backend y DevOps. Si estás contratando, quieres saber más sobre mi trabajo o simplemente conectar, mándame un mensaje.',
      },
    },
  },

  technologies: [
    { slug: 'html', name: 'HTML' },
    { slug: 'css', name: 'CSS' },
    { slug: 'bootstrap', name: 'Bootstrap' },
    { slug: 'javascript', name: 'JavaScript' },
    { slug: 'typescript', name: 'TypeScript' },
    { slug: 'react', name: 'React' },
    { slug: 'nextjs', name: 'Next.js' },
    { slug: 'jquery', name: 'jQuery' },
    { slug: 'tailwind-css', name: 'Tailwind CSS' },
    { slug: 'csharp', name: 'C#' },
    { slug: 'dotnet', name: '.NET' },
    { slug: 'java', name: 'Java' },
    { slug: 'spring', name: 'Spring' },
    { slug: 'nodejs', name: 'Node.js' },
    { slug: 'sql-server', name: 'Microsoft SQL Server' },
    { slug: 'oracle-sql', name: 'Oracle SQL' },
    { slug: 'postgresql', name: 'PostgreSQL' },
    { slug: 'docker', name: 'Docker' },
    { slug: 'ci-cd', name: 'CI/CD' },
    { slug: 'azure', name: 'Azure' },
    { slug: 'linux', name: 'Linux' },
    { slug: 'kubernetes', name: 'Kubernetes' },
    { slug: 'vercel', name: 'Vercel' },
    { slug: 'nws-api', name: 'NWS API' },
    { slug: 'mapbox', name: 'Mapbox' },
    { slug: 'github-api', name: 'GitHub API' },
    { slug: 'neon', name: 'Neon' },
    { slug: 'drizzle', name: 'Drizzle ORM' },
  ],

  skillCategories: [
    {
      slug: 'frontend',
      icon: 'code',
      technologies: ['html', 'css', 'bootstrap', 'javascript', 'typescript', 'react', 'nextjs', 'jquery'],
      translations: { en: { name: 'Frontend' }, es: { name: 'Frontend' } },
    },
    {
      slug: 'backend',
      icon: 'server',
      technologies: ['csharp', 'dotnet', 'java', 'spring', 'nodejs'],
      translations: { en: { name: 'Backend' }, es: { name: 'Backend' } },
    },
    {
      slug: 'data',
      icon: 'database',
      accent: 'gold',
      technologies: ['sql-server', 'oracle-sql'],
      translations: { en: { name: 'Data' }, es: { name: 'Datos' } },
    },
    {
      slug: 'cloud-infrastructure',
      kind: 'learning',
      icon: 'rocket',
      technologies: ['docker', 'ci-cd', 'azure', 'linux', 'kubernetes'],
      translations: {
        en: { name: 'Cloud & Infrastructure Tools' },
        es: { name: 'Herramientas de Nube e Infraestructura' },
      },
    },
  ],

  projects: [
    {
      slug: 'weather',
      status: 'published',
      featured: true,
      isLive: true,
      demoUrl: 'https://weather.alexball.dev',
      sourceUrl: 'https://github.com/AlexBall03/Weather',
      detailsUrl: 'https://github.com/AlexBall03/Weather/blob/master/README.md',
      technologies: ['nextjs', 'typescript', 'react', 'nws-api', 'mapbox', 'vercel'],
      repositories: [{ owner: 'AlexBall03', name: 'Weather', isPrimary: true }],
      translations: {
        en: {
          name: 'Weather',
          tagline: 'NWS-powered weather command center',
          summary: 'A responsive weather dashboard built around National Weather Service data, with current observations, active alerts, hourly and seven-day forecasts, and Simple/Advanced modes. The app normalizes multiple NWS sources behind a resilient server-side data layer with caching, geolocation, and Mapbox-powered location search.',
        },
        es: {
          name: 'Weather',
          tagline: 'Centro meteorológico impulsado por datos del NWS',
          summary: 'Un panel meteorológico responsivo construido sobre datos del Servicio Meteorológico Nacional de EE. UU. (NWS), con observaciones actuales, alertas activas, pronósticos por hora y de siete días, y modos Simple/Avanzado. La aplicación normaliza múltiples fuentes del NWS mediante una capa de datos del servidor con caché, geolocalización y búsqueda de ubicaciones con Mapbox.',
        },
      },
    },
    {
      slug: 'portfolio',
      status: 'published',
      featured: true,
      isLive: true,
      demoUrl: 'https://alexball.dev',
      sourceUrl: 'https://github.com/AlexBall03/Portfolio',
      detailsUrl: 'https://github.com/AlexBall03/Portfolio/blob/master/README.md',
      technologies: ['nextjs', 'typescript', 'react', 'tailwind-css', 'postgresql', 'neon', 'drizzle', 'vercel', 'github-api'],
      repositories: [{ owner: 'AlexBall03', name: 'Portfolio', isPrimary: true }],
      translations: {
        en: {
          name: 'Portfolio Website',
          tagline: 'A software engineering portfolio built like a product',
          summary: 'A bilingual engineering portfolio built as a full-stack Next.js application: server-rendered pages in English and Spanish, content modeled in Neon Postgres behind a typed domain layer, live GitHub activity, a command palette, contact delivery through Resend, and structured data for search engines.',
        },
        es: {
          name: 'Sitio Web de Portafolio',
          tagline: 'Un portafolio de ingeniería de software construido como producto',
          summary: 'Un portafolio de ingeniería bilingüe construido como una aplicación full-stack con Next.js: páginas renderizadas en el servidor en inglés y español, contenido modelado en Neon Postgres detrás de una capa de dominio tipada, actividad de GitHub en vivo, paleta de comandos, envío de mensajes con Resend y datos estructurados para buscadores.',
        },
      },
    },
  ],

  experiences: [
    {
      kind: 'career',
      organization: 'ENSYTE Energy Software International',
      startDate: '2026-03-01',
      endDate: null,
      isCurrent: true,
      translations: {
        en: {
          role: 'Junior Software Developer',
          employmentType: 'Full-time',
          location: 'Houston, Texas · Remote',
          summary: [
            'Contribute to the development and modernization of legacy desktop and web applications into a modern, web-based SaaS platform using C#/.NET, JavaScript (jQuery & React), HTML, CSS (Bootstrap), and SQL across Oracle and Microsoft SQL Server.',
            'Work across the full stack on new features, bug fixes, reporting, database-backed functionality, and legacy-system migration, with a strong focus on debugging, root-cause analysis, testing, and validation across multiple customer environments.',
            'Leverage AI-assisted development tools, including Claude Code, to accelerate implementation, investigation, and debugging while reviewing and validating changes through testing, database verification, and code review.',
          ],
          tags: ['HTML', 'CSS', 'JavaScript', 'jQuery', 'React', 'C#/.NET', 'SQL (Oracle/SQL Server)'],
        },
        es: {
          role: 'Desarrollador de Software Junior',
          employmentType: 'Tiempo Completo',
          location: 'Houston, Texas · Remoto',
          summary: [
            'Contribuyo al desarrollo y la modernización de aplicaciones heredadas de escritorio y web hacia una plataforma SaaS moderna basada en la web, usando C#/.NET, JavaScript (jQuery y React), HTML, CSS (Bootstrap) y SQL en Oracle y Microsoft SQL Server.',
            'Trabajo en todo el stack en nuevas funcionalidades, corrección de errores, reportes, funcionalidad respaldada por bases de datos y migración de sistemas heredados, con un fuerte enfoque en la depuración, el análisis de causa raíz, las pruebas y la validación en múltiples entornos de clientes.',
            'Utilizo herramientas de desarrollo asistido por IA, incluido Claude Code, para acelerar la implementación, la investigación y la depuración, revisando y validando los cambios mediante pruebas, verificación en base de datos y revisión de código.',
          ],
          tags: ['HTML', 'CSS', 'JavaScript', 'jQuery', 'React', 'C#/.NET', 'SQL (Oracle/SQL Server)'],
        },
      },
    },
    {
      kind: 'career',
      organization: 'DS Electronics',
      startDate: '2025-03-01',
      endDate: '2026-03-01',
      translations: {
        en: {
          role: 'Test Engineering Technician',
          employmentType: 'Full-time',
          location: 'Gilbert, Arizona · On-site',
          summary: [
            'Responsibilities include, but are not limited to, PCB testing, assembly, and depaneling as part of the electronics production process.',
            'All testing, assembly, and inspection is performed in accordance with ISO 9001 quality management standards.',
          ],
          tags: ['Programming', 'Communication', 'Attention to Detail', 'Problem Solving', 'Troubleshooting', 'Teamwork', 'PCB Testing', 'ISO 9001'],
        },
        es: {
          role: 'Técnico de Ingeniería de Pruebas',
          employmentType: 'Tiempo Completo',
          location: 'Gilbert, Arizona · Presencial',
          summary: [
            'Mis responsabilidades incluyen, entre otras, pruebas, ensamblaje y despaneleado de placas de circuito impreso (PCB) dentro del proceso de producción electrónica.',
            'Todas las pruebas, el ensamblaje y la inspección se realizan conforme a los estándares de gestión de calidad ISO 9001.',
          ],
          tags: ['Programación', 'Comunicación', 'Atención al Detalle', 'Resolución de Problemas', 'Diagnóstico', 'Trabajo en Equipo', 'Pruebas de PCB', 'ISO 9001'],
        },
      },
    },
    {
      kind: 'career',
      organization: 'Optilab LLC',
      startDate: '2023-05-01',
      endDate: '2025-03-01',
      translations: {
        en: {
          role: 'Fiber Optic Assembler',
          employmentType: 'Full-time',
          location: 'Phoenix, Arizona · On-site',
          summary: [
            'Tested fiber optic devices, modules, benchtops, and rackmounts, and performed single-mode, multi-mode, and polarization-maintaining fiber splicing, soldering, and precision assembly and fiber alignment of PD, PR, and BPR devices.',
            'Assisted engineers with assembly and testing for R&D work, and prepared and packaged finished products for customer orders.',
          ],
          tags: ['Fiber Optics', 'Splicing (SM/MM/PM)', 'Soldering', 'Optical Alignment', 'Device Testing', 'R&D Support', 'Attention to Detail'],
        },
        es: {
          role: 'Ensamblador de Fibra Óptica',
          employmentType: 'Tiempo Completo',
          location: 'Phoenix, Arizona · Presencial',
          summary: [
            'Realicé pruebas de dispositivos, módulos, equipos de banco y montajes en rack de fibra óptica, además de empalmes de fibra monomodo, multimodo y de mantenimiento de polarización, soldadura y el ensamblaje y alineación de precisión de dispositivos PD, PR y BPR.',
            'Apoyé a los ingenieros en el ensamblaje y las pruebas de proyectos de I+D, y preparé y empaqué productos terminados para pedidos de clientes.',
          ],
          tags: ['Fibra Óptica', 'Empalmes (SM/MM/PM)', 'Soldadura', 'Alineación Óptica', 'Pruebas de Dispositivos', 'Apoyo en I+D', 'Atención al Detalle'],
        },
      },
    },
    {
      kind: 'career',
      organization: 'Career break',
      startDate: '2022-08-01',
      endDate: '2023-05-01',
      translations: {
        en: {
          organizationLabel: 'Career break',
          role: 'Layoff/position eliminated',
          location: 'Gilbert, Arizona',
          summary: ['My position was eliminated due to organizational restructuring.'],
        },
        es: {
          organizationLabel: 'Pausa profesional',
          role: 'Puesto eliminado',
          location: 'Gilbert, Arizona',
          summary: ['Mi puesto fue eliminado debido a una reestructuración organizacional.'],
        },
      },
    },
    {
      kind: 'career',
      organization: 'VirTra',
      startDate: '2022-03-01',
      endDate: '2022-08-01',
      translations: {
        en: {
          role: 'Manufacturing Shop Assistant',
          employmentType: 'Full-time',
          location: 'Chandler, Arizona · On-site',
          summary: [
            'Operated and maintained machine shop equipment, handling daily machine warmup and upkeep, laser cutting and engraving, sand blasting, and deburring of mechanical parts.',
            'Inspected mechanical parts for quality, picked material for the machine shop and assembly floor, and managed shipping and receiving for the shop.',
          ],
          tags: ['Machine Operation', 'Laser Cutting & Engraving', 'Sand Blasting', 'Deburring', 'Parts Inspection', 'Shipping & Receiving', 'Attention to Detail'],
        },
        es: {
          role: 'Asistente de Taller de Manufactura',
          employmentType: 'Tiempo Completo',
          location: 'Chandler, Arizona · Presencial',
          summary: [
            'Operé y mantuve equipos del taller de máquinas, encargándome del calentamiento y mantenimiento diario de las máquinas, el corte y grabado láser, el chorro de arena y el desbarbado de piezas mecánicas.',
            'Inspeccioné piezas mecánicas para control de calidad, preparé material para el taller y la línea de ensamblaje, y gestioné los envíos y recepciones del taller.',
          ],
          tags: ['Operación de Máquinas', 'Corte y Grabado Láser', 'Chorro de Arena', 'Desbarbado', 'Inspección de Piezas', 'Envíos y Recepción', 'Atención al Detalle'],
        },
      },
    },
    {
      kind: 'career',
      organization: 'VirTra',
      startDate: '2021-08-01',
      endDate: '2022-03-01',
      translations: {
        en: {
          role: 'Mechanical Assembly Technician',
          employmentType: 'Full-time',
          location: 'Tempe, Arizona · On-site',
          summary: [
            'Assembled and troubleshot mechanical parts as part of the production process, and assisted with inspection to verify parts met specification before final assembly.',
            'Also performed laser cutting and engraving, and supported material picking and inventory for both the assembly floor and the machine shop.',
          ],
          tags: ['Mechanical Assembly', 'Troubleshooting', 'Parts Inspection', 'Laser Cutting & Engraving', 'Inventory & Material Picking', 'Teamwork', 'Attention to Detail'],
        },
        es: {
          role: 'Técnico de Ensamblaje Mecánico',
          employmentType: 'Tiempo Completo',
          location: 'Tempe, Arizona · Presencial',
          summary: [
            'Ensamblé y diagnostiqué piezas mecánicas dentro del proceso de producción, y apoyé en la inspección para verificar que cumplieran las especificaciones antes del ensamblaje final.',
            'También realicé corte y grabado láser, y apoyé en la preparación de material y el control de inventario para la línea de ensamblaje y el taller de máquinas.',
          ],
          tags: ['Ensamblaje Mecánico', 'Resolución de Problemas', 'Inspección de Piezas', 'Corte y Grabado Láser', 'Inventario y Material', 'Trabajo en Equipo', 'Atención al Detalle'],
        },
      },
    },
    {
      kind: 'education',
      organization: 'Western Governors University',
      startDate: '2024-02-01',
      endDate: '2028-02-01',
      isCurrent: true,
      translations: {
        en: {
          role: 'B.S. Software Engineering',
          employmentType: 'Accelerated B.S. → M.S.',
          summary: [
            "As of August 2026, I moved into WGU's Accelerated Software Engineering program, which combines the Bachelor's and Master's degrees into a single track (B.S. → M.S.).",
            'Undergraduate emphasis in Java, graduate emphasis in DevOps Engineering. Current GPA: 3.0 (WGU).',
          ],
          tags: ['Software Engineering', 'Algorithms', 'Data Structures', 'Databases', 'Web Development', 'Java', 'DevOps'],
        },
        es: {
          role: 'Licenciatura en Ingeniería de Software',
          employmentType: 'Acelerado Lic. → Maestría',
          summary: [
            'Desde agosto de 2026 formo parte del programa acelerado de Ingeniería de Software de WGU, que combina la licenciatura y la maestría en un solo plan de estudios (Lic. → Maestría).',
            'Énfasis en Java en la licenciatura y en Ingeniería DevOps en la maestría. Promedio actual: 3.0.',
          ],
          tags: ['Ingeniería de Software', 'Algoritmos', 'Estructuras de Datos', 'Bases de Datos', 'Desarrollo Web', 'Java', 'DevOps'],
        },
      },
    },
    {
      kind: 'education',
      organization: 'Homeschool',
      startDate: '2017-01-01',
      endDate: '2021-01-01',
      datePrecision: 'year',
      translations: {
        en: {
          organizationLabel: 'Homeschool',
          role: 'High School Diploma',
          summary: ['Completed a homeschool curriculum and graduated with a 4.0 GPA.'],
        },
        es: {
          organizationLabel: 'Educación en Casa',
          role: 'Diploma de Preparatoria',
          summary: ['Completé un plan de estudios de educación en casa y me gradué con un promedio de 4.0.'],
        },
      },
    },
  ],
};
