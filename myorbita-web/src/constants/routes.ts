export const ROUTES = {
    // Rotas da aplicação (React Router)
    HOME: "/",
    VAGAS_DEV: "/vagas-dev",
    VAGAS_ADV: "/vagas-adv",

    // Rotas do Firebase Realtime Database
    // Cada categoria é alimentada por múltiplas plataformas (workflows separados).
    FIREBASE_VAGAS_DEV_GUPY: "/vagas/dev/gupy",
    FIREBASE_VAGAS_DEV_LINKEDIN: "/vagas/dev/linkedin",
    FIREBASE_VAGAS_ADV_GUPY: "/vagas/adv/gupy",
    FIREBASE_VAGAS_ADV_LINKEDIN: "/vagas/adv/linkedin",
} as const;