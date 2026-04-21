# MyOrbita — Agregador Inteligente de Vagas

> Projeto full stack multiplataforma de uso pessoal e portfólio. Todos os direitos reservados. Uso comercial proibido sem autorização expressa do autor.

---

## Índice
1. [Escopo e Visão do Produto](#1-escopo-e-visão-do-produto)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Visão Geral da Arquitetura](#3-visão-geral-da-arquitetura)
4. [Padrões de Projeto](#4-padrões-de-projeto)
5. [Algoritmos e Estruturas de Dados](#5-algoritmos-e-estruturas-de-dados)
6. [Resiliência de Rede e Anti-Detecção](#6-resiliência-de-rede-e-anti-detecção)
7. [Frontend Web](#7-frontend-web)
8. [Infraestrutura e Segurança](#8-infraestrutura-e-segurança)
9. [Testes Automatizados](#9-testes-automatizados)
10. [Pré-requisitos e Instalação](#10-pré-requisitos-e-instalação)
11. [Como Executar](#11-como-executar)
12. [Estrutura do Projeto](#12-estrutura-do-projeto)

---

## 1. Escopo e Visão do Produto

O **MyOrbita** é um agregador inteligente de vagas profissionais, desenvolvido como projeto solo de uso pessoal e portfólio técnico.

### Problema
Buscar vagas em múltiplas plataformas manualmente é ineficiente e repetitivo. As plataformas disponíveis não atendem nichos específicos de forma consolidada.

### Solução
Um sistema autônomo que coleta, padroniza e serve vagas de múltiplas fontes em uma interface unificada, organizada por categoria profissional e fonte de origem.

### Categorias e Fontes Implementadas

| Categoria | Fonte | Rota Firebase |
|---|---|---|
| Tecnologia | Gupy | `/vagas/dev/gupy` |
| Tecnologia | LinkedIn | `/vagas/dev/linkedin` |
| Direito | Gupy | `/vagas/adv/gupy` |
| Direito | LinkedIn | `/vagas/adv/linkedin` |

### Plataformas Alvo

| Plataforma | Status |
|---|---|
| Web (React + Vite) | 🔵 Em desenvolvimento |
| Mobile (React Native + Expo) | 📋 Planejado |

### Decisões de Escopo
- **Uso pessoal e portfólio** — sem publicação em lojas de aplicativos
- **Monorepo** — scrapers, web e mobile no mesmo repositório para simplicidade de manutenção em equipe solo
- **Custo zero** — stack inteiramente gratuito (Firebase Spark, GitHub Actions, Vercel)

---

## 2. Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Coleta — Gupy | Python 3.11 + `requests` | API pública estável, ecossistema maduro |
| Coleta — LinkedIn | Python 3.11 + `curl_cffi` + `lxml` | TLS impersonation Chrome para bypass de Cloudflare |
| Banco de dados | Firebase Realtime DB | Gratuito, sem servidor, acesso REST nativo |
| Analytics | Google Analytics 4 (via Firebase) | Métricas de uso em tempo real, gratuito |
| Automação | GitHub Actions | CI/CD gratuito, integrado ao repositório |
| Web | React + Vite + TypeScript | Performance, ecossistema e reaproveitamento com mobile |
| Mobile | React Native + Expo | Compartilhamento de lógica com web (planejado) |
| Deploy Web | Vercel / Firebase Hosting | Gratuito, zero configuração |
| Testes Backend | pytest | Framework padrão Python |
| Testes Frontend | vitest + Playwright | Unitários + E2E com multi-browser |

---

## 3. Visão Geral da Arquitetura

O sistema foi arquitetado sob o conceito de **Desacoplamento de Jobs em Background** com **isolamento por plataforma**. Cada fonte de vagas roda em seu próprio workflow, evitando que falhas em uma plataforma afetem a outra.

```
GitHub Actions (workflows independentes)
        │
        ├──► gupy.yml (03:42 BRT)        ──► main_gupy.py     ──► GupyScraper
        │                                                          │
        └──► linkedin.yml (04:45 BRT)    ──► main_linkedin.py ──► LinkedinScraper
                                                                   │
                                          scraper_runner.py ◄──────┤
                                          (orquestração compartilhada — DRY)
                                                   │
                                                   ▼
                                          Firebase Realtime DB (my-orbit-prod)
                                          /vagas/dev/{gupy,linkedin}
                                          /vagas/adv/{gupy,linkedin}
                                                   │
                                                   ▼
                                              Web App (React)
                                              Mobile App (planejado)
```

O orquestrador (`scraper_runner.py`) concentra toda a lógica compartilhada: configuração de logging UTF-8, inicialização do Firebase, carregamento de cache de IDs existentes, deduplicação em 3 níveis, envio para o Realtime Database e métricas finais. Cada `main_*.py` apenas instancia seu scraper específico e delega ao runner.

---

## 4. Padrões de Projeto

### 4.1. Template Method (Classe Abstrata)
A classe `BaseScraper` (`abc.ABC`) define o contrato rigoroso do algoritmo de coleta.
- **Implementação:** método `buscar_vagas(palavra_chave, modalidade, limite)` é abstrato obrigatório
- **Contrato de saída:** `padronizar_vaga()` garante que toda vaga retorne um dicionário com as 15 chaves padronizadas, prevenindo quebras no frontend

### 4.2. Strategy Pattern — Isolamento por Plataforma
Cada plataforma tem seu próprio entry point (`main_gupy.py`, `main_linkedin.py`) com configuração independente.
- **Intenção:** respeitar o Princípio Aberto/Fechado (OCP). Novas fontes são adicionadas criando um novo `main_*.py` e um novo workflow, sem tocar no código existente.

### 4.3. DRY via Composição — `scraper_runner.py`
Toda a plumbing (logging, Firebase, dedup, métricas) vive em um único módulo compartilhado.
- **Intenção:** os mains ficam com ~20 linhas cada, concentrando apenas o que é específico da plataforma

### 4.4. Protocol Typing (Duck Typing Formal)
O `scraper_runner` recebe qualquer objeto que satisfaça `ScraperProtocol` (tipo estrutural do Python 3.8+), não exigindo herança rígida.

---

## 5. Algoritmos e Estruturas de Dados

### 5.1. Deduplicação em 3 Níveis — O(1)
Devido à sobreposição inevitável de palavras-chave nas buscas, a mesma vaga pode ser retornada múltiplas vezes.
- **Nível 1 — Intra-scraping:** Conjunto (`set`) de URLs vistas na execução atual. Lookup O(1) via Tabela Hash.
- **Nível 2 — Cross-execução:** IDs já existentes no Firebase são carregados em um `set` antes do scraping. Vagas que já estão no banco são identificadas sem re-download.
- **Nível 3 — ID determinístico:** `hashlib.md5(url)` gera sempre o mesmo ID para a mesma vaga, garantindo idempotência entre execuções.

### 5.2. Paginação Inteligente

**Gupy:** o scraper verifica o campo `pagination.total` da API e faz requests adicionais incrementando o `offset`. Teto de 10 páginas extras evita loops infinitos.

**LinkedIn:** paginação por `&start={offset}` em steps de 25. Teto absoluto de 4 páginas por keyword (100 vagas) para manter o custo de requests controlado.

### 5.3. Normalização de Dados
Todos os campos passam por sanitização antes de serem salvos:
- Campos de texto: `None`, string vazia e strings só com espaços são convertidos para `"Não informado"`
- Estados brasileiros: nome completo convertido para sigla UF (27 estados mapeados)
- Tipos de contrato: códigos internos da API traduzidos para português legível (CLT, PJ, Estágio, etc)
- Modalidades: valor retornado pela API/HTML traduzido para português

### 5.4. ID Determinístico
```python
hashlib.md5(link.encode('utf-8')).hexdigest()[:16]
```
O ID é sempre o mesmo para a mesma URL, permitindo deduplicação sem lookup externo e atualização idempotente das vagas no Firebase.

---

## 6. Resiliência de Rede e Anti-Detecção

### 6.1. Gupy — Resiliência Básica
A API da Gupy é pública e estável, exigindo apenas resiliência contra rate limiting eventual:

- **Exponential Backoff:** em respostas de bloqueio temporário (HTTP 429) e erros de servidor (5xx), aplica recuo exponencial (2s, 4s, 8s)
- **Retry Seletivo:** erros 400, 403 e 404 abortam imediatamente sem gastar tentativas
- **Jitter Uniforme:** ruído matemático aleatório (`random.uniform`) nos intervalos de requisição
- **User-Agent de Navegador Real:** evita bloqueios primários por identificação de bot
- **Agendamento Aleatório:** cron job em horário não-redondo (03:42 BRT)

### 6.2. LinkedIn — Blindagem em 11 Camadas
O LinkedIn utiliza Cloudflare + heurísticas próprias de detecção de bots. O scraper implementa um conjunto de camadas progressivas para manter uma taxa de sucesso alta sem autenticação:

| # | Camada | Técnica |
|---|---|---|
| 1 | **TLS Fingerprint** | `curl_cffi` com `impersonate="chrome"` — replica handshake JA3/HTTP2/ALPN idêntico ao Chrome real |
| 2 | **Session Persistente** | Cookies (`JSESSIONID`, `bcookie`, `lidc`, `__cf_bm`) mantidos entre requests como um navegador |
| 3 | **Warm-up 3 Etapas** | Google → Homepage → /jobs/ antes da primeira busca, coletando cookies naturalmente |
| 4 | **Headers Sec-Fetch** | `Sec-Fetch-Dest`, `Sec-Fetch-Mode`, `Sec-Fetch-Site` — que navegadores modernos enviam e bots geralmente não |
| 5 | **Rotação User-Agent** | 5 variações de Chrome em Windows/macOS/Linux |
| 6 | **Delays Gaussianos** | `random.gauss(media, desvio)` com jitter ±25% — humanos têm bell curve, não uniform distribution |
| 7 | **Cooldown entre Keywords** | Pausa adicional entre palavras-chave diferentes |
| 8 | **Detecção Tríplice de Bloqueio** | authwall + captcha + response size anomaly — 3 sinais antes de considerar bloqueio |
| 9 | **Circuit Breaker** | 5 erros consecutivos → abort automático para evitar ban |
| 10 | **Teto Global** | Máximo de 200 requests por execução, independente de quantas keywords |
| 11 | **Referer Chain** | Cada request tem referer da página anterior, não do Google (exceto o primeiro) |

### 6.3. Filtros LinkedIn — Validação Empírica
Os filtros de modalidade do LinkedIn foram validados empiricamente através de testes com conjuntos disjuntos:

| Parâmetro | Valor | Resultado |
|---|---|---|
| `geoId=106057199` | Brasil | Força apenas vagas brasileiras (sem mistura global) |
| `f_WT=1` | Presencial | Conjunto 100% disjunto das demais modalidades |
| `f_WT=2` | Remoto | Conjunto 100% disjunto das demais modalidades |
| `f_WT=3` | Híbrido | Conjunto 100% disjunto das demais modalidades |

---

## 7. Frontend Web

### 7.1. Dados Exibidos por Vaga

| Campo | Origem | Exibição |
|---|---|---|
| Título | API Gupy / HTML LinkedIn | Card + Detalhe |
| Empresa | API Gupy / HTML LinkedIn | Card + Detalhe |
| Modalidade | Gupy: `workplaceType` / LinkedIn: filtro `f_WT` | Badge colorido (Remoto/Híbrido/Presencial) |
| Localização | `city`, `state`, `country` | Ícone MapPin + "Cidade, UF" |
| Tipo de Contrato | API Gupy (`type`) | Badge colorido |
| PCD | API Gupy (`disabilities`) | Badge verde quando inclusiva |
| Data de Publicação | Ambas as fontes | Formato dd/mm/aaaa |
| Prazo de Inscrição | API Gupy (`applicationDeadline`) | Cor dinâmica |
| Origem | Scraper | Badge Gupy (azul claro) / LinkedIn (azul escuro) |

### 7.2. Sistema de Filtros

| Filtro | Tipo | Dados |
|---|---|---|
| Busca textual | Input livre | Título, empresa, cidade, estado, contrato |
| Modalidade | Toggle buttons | Remoto / Híbrido / Presencial |
| Nível hierárquico | Select | Estágio / Júnior / Pleno / Sênior (inferido do título) |
| Estado (UF) | Select dinâmico | Populado automaticamente |
| Tipo de contrato | Select dinâmico | Populado automaticamente |
| PCD | Toggle button | Mostra apenas vagas inclusivas |
| Origem (Gupy/LinkedIn) | Toggle buttons | Filtrar por fonte |
| Ordenação | Select | Mais recentes / Mais antigas |

Filtros implementados via custom hook `useFiltrosVagas` com `useMemo` para performance. Paginação de 9 vagas por página.

### 7.3. Responsividade

| Breakpoint | Layout |
|---|---|
| ≤ 480px (mobile) | 1 coluna, filtros empilhados, menu hamburger |
| ≤ 768px (tablet) | 2 colunas, filtros em grid 2x2 |
| > 768px (desktop) | 3 colunas, filtros em grid 4x1 |

### 7.4. Design System

| Propriedade | Valor |
|---|---|
| Fonte | Space Grotesk |
| Background | Tema galáctico com `PlanetarySystem` |
| Cor primária (Dev) | `#4FC3F7` (azul) |
| Cor primária (Adv) | `#FFB703` (amarelo) |
| Cor de fundo | `#050015` |
| Badge Gupy | `#4FC3F7` (azul claro) |
| Badge LinkedIn | `#0077B5` (azul oficial LinkedIn) |
| Efeito de título | `textShadow` com glow |
| Transições | Animação de viagem entre páginas (`PageTransition`) |

---

## 8. Infraestrutura e Segurança

### Firebase Realtime Database
- Projeto: `my-orbit-prod` (US Central)
- SDK Admin (backend) com privilégios elevados, independente das Security Rules
- SDK Web (frontend) com chaves públicas protegidas por Security Rules
- Google Analytics 4 integrado para métricas de uso

### Workflows Isolados

| Workflow | Cron | Timeout | Deps |
|---|---|---|---|
| `gupy.yml` | 03:42 BRT | 60 min | `firebase-admin`, `python-dotenv`, `requests` |
| `linkedin.yml` | 04:45 BRT | 120 min | + `curl_cffi`, `lxml` |

Falha em um workflow não afeta o outro. Cada um escreve em sua rota Firebase isolada, eliminando race conditions.

### Gerenciamento de Credenciais

**Backend (Python):**
- Chave de serviço Firebase em `secrets/firebase_key.json` (gitignored)
- Variáveis de ambiente via `.env` com `python-dotenv`
- Em produção (GitHub Actions), credenciais injetadas via **GitHub Secrets**:
  - `FIREBASE_CREDENTIALS` — JSON da Service Account
  - `FIREBASE_DB_URL` — URL do Realtime Database

**Frontend (React):**
- Credenciais Firebase Web SDK via `import.meta.env.VITE_*` (Vite)
- Arquivo `myorbita-web/.env` gitignored
- Chaves do Firebase Web SDK são públicas por design (controle via Security Rules)

### Logging e Monitoramento
- Logging estruturado via `logging` com output dual (terminal UTF-8 + arquivo)
- Arquivo `scraper.log` gerado a cada execução
- Upload automático como artifact no GitHub Actions (7 dias Gupy, 14 dias LinkedIn)
- Métricas ao final de cada execução: duração, vagas/segundo, taxa de duplicatas, taxa de erro
- Google Analytics coletando métricas de uso do frontend automaticamente

### Arquivos protegidos pelo `.gitignore`
```
secrets/
*adminsdk*.json
.env
myorbita-web/.env
scraper.log
db_temp.json
```

---

## 9. Testes Automatizados

O projeto possui um plano de testes abrangente documentado em `PLANO_TESTES.md`, cobrindo:

| Categoria | Ferramenta | Casos |
|---|---|---|
| Unitários (Backend) | pytest | Normalização, mapeamentos, IDs, deduplicação, contrato |
| Integração (Backend) | pytest | Validação da API Gupy, parser LinkedIn, Firebase |
| Resiliência (Backend) | pytest | Retry/backoff, JSON malformado, timeout, circuit breaker |
| Unitários (Frontend) | vitest | Hook de filtros, utilitários |
| Responsividade | Playwright | 6 viewports, scroll, grid, hamburger |
| Segurança | Playwright | XSS, paths sensíveis, credenciais |
| Usabilidade | Playwright | Filtros, modais, paginação, estados |
| Acessibilidade | Playwright + axe-core | WCAG A, contraste, teclado |
| Performance | Playwright | FCP, LCP, bundle size |
| Regressão Visual | Playwright | Screenshots comparativos |
| Cross-browser | Playwright | Chromium, Firefox, WebKit |
| Integridade de Dados | Playwright | Duplicatas, URLs, campos obrigatórios |
| SEO | Playwright | Title, meta, OG tags, headings |

---

## 10. Pré-requisitos e Instalação

### Backend (Scrapers)

- **Python 3.11+**
- Gerenciador de pacotes `pip`

```bash
# Dependências comuns
pip install firebase-admin python-dotenv requests

# Dependências específicas do LinkedIn
pip install curl_cffi lxml
```

Configure o ambiente:
1. Crie a pasta `secrets/` na raiz do projeto
2. Baixe a Service Account do Firebase Console e salve como `secrets/firebase_key.json`
3. Crie o arquivo `.env` na raiz:

```env
FIREBASE_KEY_PATH=secrets/firebase_key.json
FIREBASE_DB_URL=https://my-orbit-prod-default-rtdb.firebaseio.com
```

### Frontend (Web)

- **Node.js 18+**
- Gerenciador de pacotes `npm`

```bash
cd myorbita-web
npm install
```

Configure o ambiente criando `myorbita-web/.env`:

```env
VITE_FIREBASE_API_KEY=sua-api-key
VITE_FIREBASE_AUTH_DOMAIN=my-orbit-prod.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://my-orbit-prod-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=my-orbit-prod
VITE_FIREBASE_STORAGE_BUCKET=my-orbit-prod.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

---

## 11. Como Executar

### Scrapers — Execução manual

**Gupy:**
```bash
python main_gupy.py
```

**LinkedIn:**
```bash
python main_linkedin.py
```

Cada script processa as categorias (dev/adv) em sequência, exibindo progresso em tempo real com métricas ao final.

### Scrapers — Execução automatizada
O GitHub Actions executa os workflows automaticamente:
- **Gupy:** todo dia às 03:42 BRT (~30 min de duração)
- **LinkedIn:** todo dia às 04:45 BRT (~1h a 1h30 de duração)

Execução manual também disponível via **Actions → Run workflow** no GitHub.

### Frontend — Desenvolvimento
```bash
cd myorbita-web
npm run dev
```

### Frontend — Build de produção
```bash
cd myorbita-web
npm run build
```

---

## 12. Estrutura do Projeto

```
MyOrbita-Scraper/
├── .claude/
│   └── CLAUDE.md                       # Contexto para assistente IA
├── .github/
│   └── workflows/
│       ├── gupy.yml                    # GitHub Actions — Gupy diário 03:42 BRT
│       └── linkedin.yml                # GitHub Actions — LinkedIn diário 04:45 BRT
├── myorbita-web/                       # Aplicação web React + Vite + TypeScript
│   ├── src/
│   │   ├── components/                 # Header, VagaDetalhe, PageTransition, PlanetarySystem
│   │   ├── constants/                  # colors.ts, typography.ts, routes.ts
│   │   ├── hooks/                      # useFiltrosVagas
│   │   ├── pages/                      # Home, VagasDev, VagasAdv
│   │   ├── services/                   # api.ts, firebase.ts
│   │   ├── stores/                     # transitionStore (Zustand)
│   │   └── types/                      # IVaga.ts
│   └── .env                            # Variáveis Firebase Web (não versionado)
├── myorbita-app/                       # React Native + Expo (Sprint 8 — bloqueado)
├── queries/
│   ├── tecnologia_gupy.json            # Keywords tecnologia → Gupy
│   ├── tecnologia_linkedin.json        # Keywords tecnologia → LinkedIn
│   ├── advogados_gupy.json             # Keywords direito → Gupy
│   └── advogados_linkedin.json         # Keywords direito → LinkedIn
├── scrapers/
│   ├── __init__.py
│   ├── base_scraper.py                 # Contrato abstrato (Template Method)
│   ├── gupy_scraper.py                 # Implementação Gupy (API)
│   └── linkedin_scraper.py             # Implementação LinkedIn (HTML + curl_cffi, 11 camadas anti-detecção)
├── tests/                              # Testes backend (pytest) — planejado
├── secrets/
│   └── firebase_key.json               # Service Account Firebase (não versionado)
├── .env                                # Variáveis backend (não versionado)
├── .gitignore
├── main_gupy.py                        # Entry point Gupy — delega ao scraper_runner
├── main_linkedin.py                    # Entry point LinkedIn — delega ao scraper_runner
├── scraper_runner.py                   # Orquestração compartilhada (logging, Firebase, dedup, métricas)
├── PLANO_TESTES.md                     # Plano de testes automatizados (100+ casos)
└── README.md
```

---

*MyOrbita © 2026 — Todos os direitos reservados. Uso comercial proibido sem autorização expressa do autor.*