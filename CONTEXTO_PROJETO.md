# CONTEXTO DO PROJETO — MyOrbita
> Gerado em: 21/04/2026 | Usar como base para planejamento de tasks

---

## 1. VISÃO GERAL

MyOrbita é um agregador inteligente de vagas profissionais — projeto solo de portfólio técnico. Coleta vagas de Gupy (via API REST) e LinkedIn (via HTML scraping), padroniza e serve em interface web React organizada por categoria (Tecnologia e Direito).

**Monorepo** com três camadas:
- **Backend Python** — scrapers + orquestração + CI/CD
- **Frontend Web** — React + Vite + TypeScript (em desenvolvimento)
- **Mobile** — React Native + Expo (planejado, bloqueado)

---

## 2. ESTADO ATUAL POR CAMADA

### 2.1 Backend — ✅ Completo e em Produção

| Arquivo | Linhas | Status | Responsabilidade |
|---|---|---|---|
| `main_gupy.py` | 31 | ✅ Completo | Entry point Gupy — instancia scraper e delega para runner |
| `main_linkedin.py` | 31 | ✅ Completo | Entry point LinkedIn — mesma estrutura que Gupy |
| `scraper_runner.py` | 329 | ✅ Completo | Orquestração central — logging, Firebase, dedup, checkpoint, métricas |
| `scrapers/base_scraper.py` | 174 | ✅ Completo | Classe abstrata — contrato, normalização, backoff |
| `scrapers/gupy_scraper.py` | 158 | ✅ Completo | Scraper Gupy via API REST com paginação |
| `scrapers/linkedin_scraper.py` | 687 | ✅ Completo | Scraper LinkedIn com 11 camadas anti-detecção |
| `.github/workflows/gupy.yml` | 50 | ✅ Completo | Workflow cron 03:42 BRT — timeout 60 min |
| `.github/workflows/linkedin.yml` | 52 | ✅ Completo | Workflow cron 04:45 BRT — sem timeout fixo |

**Rotas Firebase populadas diariamente:**
- `/vagas/dev/gupy` — Tecnologia via Gupy
- `/vagas/dev/linkedin` — Tecnologia via LinkedIn
- `/vagas/adv/gupy` — Direito via Gupy
- `/vagas/adv/linkedin` — Direito via LinkedIn

**Volume típico por execução:**
- Gupy: ~747 buscas (86 keywords × 3 modalidades dev + 163 × 3 adv) → ~1500–2500 vagas únicas
- LinkedIn: ~747 buscas → ~800–1500 vagas únicas (delays anti-detecção tornam mais lento)

### 2.2 Frontend Web — ✅ ~90% Completo

**Stack:** React 19 + Vite 8 + TypeScript 5.9 + Tailwind CSS 4 + Firebase Web SDK 12

| Arquivo | Linhas | Status | Responsabilidade |
|---|---|---|---|
| `src/main.tsx` | — | ✅ | Entry point React + BrowserRouter |
| `src/App.tsx` | 36 | ✅ | SPA router — 3 rotas (Home, VagasDev, VagasAdv) |
| `src/pages/Home.tsx` | 114 | ✅ | Landing page — hero + 2 cards de categoria |
| `src/pages/VagasDev.tsx` | 719 | ✅ | Listagem dev — filtros completos + paginação + modal |
| `src/pages/VagasAdv.tsx` | ~700 | ✅ | Idêntica à VagasDev com cores/rotas de ADV |
| `src/components/VagaDetalhe.tsx` | 234 | ✅ | Modal de detalhes da vaga com link externo |
| `src/components/Header.tsx` | — | ✅ | Logo + navegação |
| `src/components/PageTransition.tsx` | — | ✅ | Wrapper animação entre páginas (Framer Motion) |
| `src/components/PlanetarySystem.tsx` | — | ✅ | Animação de fundo via Rive |
| `src/hooks/useCacheVagas.ts` | 249 | ✅ | Cache localStorage por rota — TTL 1h, resiliente |
| `src/hooks/useFiltrosVagas.ts` | 252 | ✅ | Pipeline de 8 filtros + paginação (9/página) |
| `src/services/firebase.ts` | 18 | ✅ | Inicialização Firebase SDK |
| `src/services/api.ts` | 37 | ✅ | `getVagas(rotas)` com Promise.allSettled |
| `src/stores/transitionStore.ts` | — | ✅ | Zustand — estado da animação warp speed |
| `src/types/IVaga.ts` | 19 | ✅ | Interface IVaga com campos opcionais novos |
| `src/constants/routes.ts` | — | ✅ | Rotas SPA + rotas Firebase mapeadas |
| `src/constants/colors.ts` | — | ✅ | Design system — paleta de cores |
| `src/constants/typography.ts` | — | ✅ | Design system — tipografia |

**Funcionalidades do frontend implementadas:**
- Busca textual (remove acentos, case-insensitive)
- Filtro de modalidade: Todas / Remoto / Híbrido / Presencial
- Filtro de nível: Estágio / Júnior / Pleno / Sênior (regex com word boundaries)
- Filtro de estado: dropdown dinâmico com estados extraídos das vagas
- Filtro de contrato: dropdown dinâmico (CLT, PJ, Estágio, etc.)
- Filtro PCD: toggle boolean
- Filtro de origem: Gupy / LinkedIn (toggle)
- Ordenação: Mais recentes / Mais antigas / Por empresa
- Chips de filtros ativos com remoção individual
- Paginação: 9 vagas/página com reset automático ao filtrar
- Modal de detalhes da vaga com link externo
- Cache local (localStorage) por rota Firebase — TTL 1h
- Pull-to-refresh via botão que invalida cache
- Badge de origem colorido (Gupy `#4FC3F7` / LinkedIn `#0077B5`)
- Timestamp "Atualizado há X" no rodapé
- Empty state com sugestão de limpar filtros

**O que ainda não tem no frontend:**
- Footer (nenhum componente de footer existe atualmente)
- Termos de Uso (sem página nem modal)
- Política de Privacidade (sem página nem modal)
- Sobre / Créditos (sem página nem modal)
- "Como usar" / "Como funciona" (sem dropdown nem modal)
- Cross-browser testing (adiado)

### 2.3 Mobile — 🚫 Bloqueado (Sprint 8)

Não iniciado. Planejado como React Native + Expo.

---

## 3. ARQUITETURA DE DADOS

### Interface IVaga (TypeScript)
```typescript
interface IVaga {
  id: string;
  titulo: string;
  empresa: string;
  modalidade: string;        // "Remoto" | "Híbrido" | "Presencial"
  link: string;
  data_publicacao: string;   // ISO 8601
  origem: string;            // "Gupy" | "LinkedIn"

  // Campos opcionais
  city?: string;
  state?: string;            // Sigla UF (SP, RJ, MG...)
  country?: string;
  workplace_type?: string;
  is_remote?: boolean;
  tipo_contrato?: string;    // CLT | PJ | Estágio | Temporário | Outros
  prazo_inscricao?: string;
  pcd?: boolean;
}
```

### Roteamento SPA
```
/             → Home (2 cards: Dev e Adv)
/vagas-dev    → VagasDev (filtros + listagem)
/vagas-adv    → VagasAdv (filtros + listagem)
```

---

## 4. DEPENDÊNCIAS E VERSÕES

### Backend (Python 3.11)
| Pacote | Uso |
|---|---|
| `firebase-admin` | SDK Admin para escrita no Realtime DB |
| `python-dotenv` | Lê `.env` com credenciais |
| `requests` | HTTP para API Gupy |
| `curl_cffi` | TLS impersonation Chrome para LinkedIn |
| `lxml` | Parser HTML para scraping LinkedIn |

### Frontend (Node)
| Pacote | Versão | Uso |
|---|---|---|
| `react` + `react-dom` | 19.2.4 | UI |
| `react-router-dom` | 7.13.2 | SPA routing |
| `firebase` | 12.12.0 | Realtime DB + Analytics |
| `framer-motion` | 12.38.0 | Animações de transição |
| `zustand` | 5.0.12 | State global mínimo |
| `lucide-react` | 1.8.0 | Ícones |
| `@rive-app/react-canvas` | 4.27.3 | Animação PlanetarySystem |
| `tailwindcss` | 4.2.2 (vite plugin) | Estilização utility-first |
| `vite` | 8.0.1 | Build tool |
| `typescript` | 5.9.3 | Type safety |

---

## 5. SPRINT 7 — CONTEXTO PARA PLANEJAMENTO

### O que existe hoje que é base para o Sprint 7

**Footer:** Não existe nenhum componente de Footer no projeto atualmente. Será criado do zero.

**Modais:** O projeto já tem `VagaDetalhe.tsx` como modal funcional (overlay semi-transparente, fechar com click externo ou botão ×). Esse padrão deve ser reutilizado para os novos modais do Sprint 7.

**Roteamento:** O App.tsx tem 3 rotas SPA. As páginas do Sprint 7 podem ser acessadas via modal no footer (sem criar novas rotas) ou via rotas dedicadas — a decisão impacta o comportamento de URL, deep linking e compatibilidade mobile.

**Design System:** `constants/colors.ts` e `constants/typography.ts` existem e devem ser usados.

**Animações:** Framer Motion já está instalado e em uso. Modais podem usar `AnimatePresence` + `motion.div`.

### Decisão de arquitetura pendente para Sprint 7

O Sprint 7 define que as páginas estáticas (Termos, Privacidade, Sobre, Como Usar, Como Funciona) ficam no **footer como modais** — não como páginas com rota dedicada. Isso está alinhado com a nota no CLAUDE.md:

> "cada uma terá seu próprio modal, acredito ficar mais condinzente e dinâmico com o projeto atual."

**Implicações:**
- Footer fixo ou sticky no bottom de `VagasDev`, `VagasAdv` e `Home`
- Cada item do footer abre um modal (mesmo padrão de `VagaDetalhe`)
- Termos e Privacidade precisam de URL dedicada também (LGPD/Play Store exige link público)
- "Como funciona" e "Como usar" são informativos — modal é suficiente
- Mobile: sem hover → tap abre modal (igual ao hover web)

### Tasks planejadas — Sprint 7

**Pré-requisito de todas as tasks:**
- [ ] Criar componente `Footer.tsx` com seção de links para os modais

**FASE 7.1 — Termos de Uso**
- Modal com conteúdo (LGPD, uso do Google Analytics, dados coletados, scrapers)
- Rota pública `/termos` (necessário para Play Store e LGPD)
- Link no Footer

**FASE 7.2 — Política de Privacidade**
- Modal com conteúdo (dados coletados, finalidade, retenção, contato)
- Rota pública `/privacidade` (necessário para Play Store e LGPD)
- Link no Footer

**FASE 7.3 — Sobre / Créditos**
- Modal informativo: o que é o MyOrbita, quem fez, stack usada, contato/portfólio
- Link no Footer (sem necessidade de rota dedicada)

**FASE 7.4 — Como usar / Como funciona**
- Dois modais distintos ou um com tabs
- "Como usar": navegação, filtros, como abrir vaga, atualização
- "Como funciona": fluxo scraping → Firebase → frontend (high-level, sem código)
- Link no Footer (sem necessidade de rota dedicada)
- Web: link clicável no footer; Mobile: tap abre modal

**FASE 7.5 — Deploy**
- Vercel ou Firebase Hosting
- `.env` configurado na plataforma
- URL pública funcional

**FASE 7.6 — Monitoramento Firebase**
- Alertas de cota no console Firebase ou script de verificação

---

## 6. PADRÕES A SEGUIR NAS NOVAS TASKS

### Componente Modal (padrão existente — VagaDetalhe.tsx)
```tsx
// Estrutura já validada no projeto:
<div className="overlay" onClick={fecharAoClicarFora}>
  <motion.div className="modal-container">
    <button onClick={onFechar}>×</button>
    {/* conteúdo */}
  </motion.div>
</div>
```

### Convenções TypeScript
- PascalCase para componentes: `TermosDeUso`, `PoliticaPrivacidade`
- Interfaces com prefixo `I`: `IModalProps`
- kebab-case para arquivos: `termos-de-uso.tsx`
- Props tipadas inline ou via interface separada

### Commits semânticos obrigatórios
- `feat(web): adiciona footer com links de modais`
- `feat(web): implementa modal termos de uso`
- `feat(web): implementa rota /termos`

---

## 7. GAPS CONHECIDOS E DÍVIDAS TÉCNICAS

| Item | Impacto | Prioridade |
|---|---|---|
| Sem testes automatizados (backend e frontend) | Risco de regressão silenciosa | Baixa (planejado futuro) |
| Cross-browser testing não feito | Possível bug em Safari/Firefox | Baixa (adiado) |
| Mobile bloqueado (sem AVD/Expo Orbit) | Sem versão mobile | Bloqueado por ambiente |
| Footer inexistente | Sprint 7 depende dele | Alta — pré-requisito Sprint 7 |
| Sem rotas /termos e /privacidade | LGPD/Play Store | Alta — Sprint 7.1 e 7.2 |
| Monitoramento de cota Firebase manual | Risco de cota silenciosa | Média — Sprint 7.6 |

---

## 8. FLUXO DE DADOS COMPLETO (referência)

```
GitHub Actions (cron)
  └─ main_*.py
       └─ ScraperRunner.executar()
            ├─ Carrega queries/*.json (keywords + modalidades)
            ├─ Pré-carrega IDs do Firebase (dedup cross-execução)
            ├─ Loop: keyword × modalidade
            │    ├─ scraper.buscar_vagas() → lista padronizada
            │    ├─ Dedup 3 níveis (session, Firebase, MD5)
            │    └─ Checkpoint a cada 10 keywords → Firebase ref.set()
            └─ Snapshot final → Firebase ref.set()

Firebase Realtime DB
  ├─ /vagas/dev/gupy    → {id: IVaga, ...}
  ├─ /vagas/dev/linkedin
  ├─ /vagas/adv/gupy
  └─ /vagas/adv/linkedin

React App (usuário abre no browser)
  └─ useCacheVagas([rotas])
       ├─ Hit localStorage (TTL 1h) → retorna imediato
       └─ Miss → api.getVagas([rotas])
                    └─ Promise.allSettled → Firebase REST
                         └─ Salva no localStorage + estado

useFiltrosVagas(vagas)
  └─ Pipeline: busca → modalidade → nível → estado → contrato → PCD → origem → sort
       └─ Paginação: 9 vagas/página

VagasDev / VagasAdv (render)
  └─ Cards → click → VagaDetalhe (modal) → link externo
```
