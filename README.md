# MyOrbita — Agregador Inteligente de Vagas

> Projeto full stack multiplataforma de uso pessoal e portfólio. Todos os direitos reservados. Uso comercial proibido sem autorização expressa do autor.

---

## Índice
1. [Escopo e Visão do Produto](#1-escopo-e-visão-do-produto)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Visão Geral da Arquitetura](#3-visão-geral-da-arquitetura)
4. [Padrões de Projeto](#4-padrões-de-projeto)
5. [Algoritmos e Estruturas de Dados](#5-algoritmos-e-estruturas-de-dados)
6. [Resiliência de Rede e Evasão](#6-resiliência-de-rede-e-evasão)
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
Um sistema autônomo que coleta, padroniza e serve vagas de múltiplas fontes em uma interface unificada, organizada por categoria profissional.

### Categorias Implementadas

| Categoria | Fonte | Rota Firebase |
|---|---|---|
| Tecnologia | Gupy | `/vagas-dev` |
| Direito | Gupy | `/vagas-adv` |

### Plataformas Alvo

| Plataforma | Status |
|---|---|
| Web (React + Vite) | 🔵 Em desenvolvimento |
| Mobile (React Native + Expo) | 📋 Planejado |

### Decisões de Escopo
- **Uso pessoal e portfólio** — sem publicação em lojas de aplicativos
- **Monorepo** — scraper, web e mobile no mesmo repositório para simplicidade de manutenção em equipe solo
- **Custo zero** — stack inteiramente gratuito (Firebase Spark, GitHub Actions, Vercel)

---

## 2. Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Coleta de dados | Python 3.11 | Ecossistema maduro para scraping |
| Banco de dados | Firebase Realtime DB | Gratuito, sem servidor, acesso REST nativo |
| Automação | GitHub Actions | CI/CD gratuito, integrado ao repositório |
| Web | React + Vite + TypeScript | Performance, ecossistema e reaproveitamento com mobile |
| Mobile | React Native + Expo | Compartilhamento de lógica com web (planejado) |
| Deploy Web | Vercel / Firebase Hosting | Gratuito, zero configuração |
| Testes Backend | pytest | Framework padrão Python |
| Testes Frontend | vitest + Playwright | Unitários + E2E com multi-browser |

---

## 3. Visão Geral da Arquitetura

O sistema foi arquitetado sob o conceito de **Desacoplamento de Jobs em Background**. O script Python opera de forma independente do front-end, consolidando um alto volume de dados de múltiplas categorias profissionais e enviando-os ao Firebase Realtime Database via SDK Admin.

O fluxo completo é:

```
GitHub Actions (03:24 diário)
        ↓
    main.py (orquestrador)
        ↓
  Scrapers (Gupy, ...) — com paginação automática
        ↓
  Normalização + Deduplicação (3 níveis)
        ↓
Firebase Realtime DB
    ↙        ↘
Web App    Mobile App
(React)    (Expo — planejado)
```

O script itera sobre um dicionário de categorias (`CATEGORIAS`), processando cada uma de forma independente: lê seu arquivo de queries, executa as buscas com paginação automática, salva um backup local com escrita atômica e faz o upload para a rota correspondente no Firebase.

---

## 4. Padrões de Projeto

### 4.1. Template Method (Classe Abstrata)
Para garantir a padronização absoluta dos dados enviados ao front-end, o sistema utiliza o padrão *Template Method* através da biblioteca nativa `abc` (Abstract Base Classes).
- **Implementação:** A classe `BaseScraper` define o contrato rigoroso do algoritmo.
- **Intenção:** Qualquer novo scraper é forçado a herdar esta classe e implementar o método `buscar_vagas`. O método `padronizar_vaga` garante que o dicionário de saída contenha sempre as 15 chaves padronizadas, prevenindo quebras no mapeamento da interface do usuário.

### 4.2. Strategy Pattern — Roteamento de Scrapers
O núcleo do sistema (`main.py`) é isento de lógicas condicionais complexas para seleção de plataforma.
- **Implementação:** O dicionário `SCRAPERS_DISPONIVEIS` mapeia o nome da plataforma diretamente para o objeto de sua classe.
- **Intenção:** Respeitar o Princípio Aberto/Fechado (OCP). Novas plataformas de busca podem ser adicionadas com uma única linha no dicionário, sem alterar nenhuma outra função.

### 4.3. Strategy Pattern — Roteamento de Categorias
O mesmo princípio é aplicado às categorias profissionais através do dicionário `CATEGORIAS`.
- **Implementação:** Cada entrada do dicionário carrega o trio `{queries, db, rota}`, tornando cada categoria completamente autossuficiente.
- **Intenção:** Adicionar uma nova categoria exige apenas uma nova linha no dicionário — o loop de orquestração não precisa ser tocado.

---

## 5. Algoritmos e Estruturas de Dados

### 5.1. Deduplicação em 3 Níveis — O(1)
Devido à sobreposição inevitável de palavras-chave nas buscas, a mesma vaga pode ser retornada múltiplas vezes.
- **Nível 1 — Intra-scraping:** Conjunto (`set`) de URLs vistas na execução atual. Complexidade O(1) por lookup via Tabela Hash.
- **Nível 2 — Cross-execução:** IDs já existentes no Firebase são carregados em um `set` antes do scraping. Vagas que já estão no banco são identificadas sem re-download.
- **Nível 3 — ID determinístico:** `hashlib.md5(url)` gera sempre o mesmo ID para a mesma vaga, garantindo idempotência entre execuções.

### 5.2. Paginação Inteligente
O scraper verifica o campo `pagination.total` da API e, se o total excede o limite por página, faz requests adicionais incrementando o `offset`. Teto de segurança de 10 páginas extras (500 vagas por query) evita loops infinitos.

### 5.3. Escrita Atômica (Atomic Write)
O salvamento local do banco de dados é tratado como operação crítica para evitar corrupção em caso de interrupções.
- **Mecanismo:** Os dados são persistidos em um arquivo temporário (`db_temp.json`). Após o sucesso do I/O, o sistema operacional executa a substituição do arquivo original de forma instantânea e indivisível (`os.replace`).

### 5.4. Normalização de Dados
Todos os campos passam por sanitização antes de serem salvos:
- Campos de texto: `None`, string vazia e strings só com espaços são convertidos para `"Não informado"`.
- Estados brasileiros: nome completo é convertido para sigla UF (27 estados mapeados).
- Tipos de contrato: códigos internos da API são traduzidos para português legível (CLT, PJ, Estágio, etc).
- Modalidades: o valor retornado pela API (`remote`, `hybrid`, `on-site`) é traduzido para português.

---

## 6. Resiliência de Rede e Evasão

Para mitigar bloqueios aplicados por Web Application Firewalls (WAF) em operações de scraping em lote, o módulo base implementa algoritmos de resiliência e disfarce:

- **Exponential Backoff:** Em respostas de bloqueio temporário (HTTP 429) e erros de servidor (5xx), o sistema aplica recuo exponencial no tempo de espera antes da próxima tentativa (2s, 4s, 8s).
- **Retry Seletivo:** Erros 400, 403 e 404 abortam imediatamente sem gastar tentativas — retry não resolveria esses casos.
- **Jitter Uniforme:** Inserção de ruído matemático aleatório (`random.uniform`) nos intervalos de requisição, simulando comportamento humano.
- **User-Agent de Navegador Real:** Todas as requisições utilizam um User-Agent moderno para evitar bloqueios primários por identificação de bot.
- **Agendamento Aleatório:** O cron job é configurado em horário não-redondo (03:24) para evitar detecção por padrão temporal fixo.

---

## 7. Frontend Web

### 7.1. Dados Exibidos por Vaga

| Campo | Origem | Exibição |
|---|---|---|
| Título | API Gupy (`name`) | Card + Detalhe |
| Empresa | API Gupy (`careerPageName`) | Card + Detalhe |
| Modalidade | API Gupy (`workplaceType`) | Badge colorido (Remoto/Híbrido/Presencial) |
| Localização | API Gupy (`city`, `state`) | Ícone MapPin + "Cidade, UF" |
| Tipo de Contrato | API Gupy (`type`) | Badge colorido (CLT/PJ/Estágio/etc) |
| PCD | API Gupy (`disabilities`) | Badge verde quando inclusiva |
| Data de Publicação | API Gupy (`publishedDate`) | Formato dd/mm/aaaa |
| Prazo de Inscrição | API Gupy (`applicationDeadline`) | Cor dinâmica: verde (aberta), amarelo (≤7 dias), vermelho (expirada) |
| Origem | Scraper | Badge "Gupy" |

### 7.2. Sistema de Filtros

| Filtro | Tipo | Dados |
|---|---|---|
| Busca textual | Input livre | Busca em título, empresa, cidade, estado, contrato |
| Modalidade | Toggle buttons | Remoto / Híbrido / Presencial |
| Nível hierárquico | Select | Estágio / Júnior / Pleno / Sênior (inferido do título) |
| Estado (UF) | Select dinâmico | Populado automaticamente com estados presentes nas vagas |
| Tipo de contrato | Select dinâmico | Populado automaticamente com contratos presentes |
| PCD | Toggle button | Mostra apenas vagas inclusivas |
| Ordenação | Select | Mais recentes / Mais antigas |

Filtros são implementados via custom hook `useFiltrosVagas` com `useMemo` para performance. Paginação de 9 vagas por página.

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
| Background | Tema galáctico com PlanetarySystem |
| Cor primária (Dev) | `#4FC3F7` (azul) |
| Cor primária (Adv) | `#FFB703` (amarelo) |
| Cor de fundo | `#050015` |
| Efeito de título | textShadow com glow |
| Transições | Animação de viagem entre páginas (PageTransition) |

---

## 8. Infraestrutura e Segurança

### Firebase Realtime Database
O Firebase atua como camada de persistência em nuvem. O scraper utiliza o SDK Admin para autenticação com privilégios elevados, independente das regras de segurança do banco.

### Gerenciamento de Credenciais

**Backend (Python):**
- A chave de serviço do Firebase fica armazenada localmente em `secrets/`, ignorada pelo `.gitignore`.
- As variáveis de ambiente são carregadas via `.env` com a biblioteca `python-dotenv`.
- Em produção (GitHub Actions), as credenciais são injetadas via **GitHub Secrets**.

**Frontend (React):**
- As credenciais do Firebase Web SDK são carregadas via variáveis de ambiente do Vite (`import.meta.env.VITE_*`).
- O arquivo `myorbita-web/.env` é ignorado pelo `.gitignore`.
- As chaves do Firebase Web SDK são públicas por design (controle de acesso via Security Rules).

### Logging e Monitoramento
- Logging estruturado via módulo `logging` do Python com output dual (terminal + arquivo).
- Arquivo `scraper.log` gerado a cada execução com encoding UTF-8.
- Upload automático do log como artifact no GitHub Actions (retenção de 7 dias).
- Métricas ao final de cada execução: duração, vagas/segundo, taxa de duplicatas.

### Arquivos protegidos pelo `.gitignore`
```
secrets/
*adminsdk*.json
.env
myorbita-web/.env
scraper.log
```

### GitHub Actions
- Workflow `scraper.yml` com `timeout-minutes: 90` para proteção contra travamentos.
- Upload de logs como artifact para debug pós-execução.

---

## 9. Testes Automatizados

O projeto possui um plano de testes abrangente documentado em `PLANO_TESTES.md`, cobrindo:

| Categoria | Ferramenta | Casos |
|---|---|---|
| Unitários (Backend) | pytest | Normalização, mapeamentos, IDs, deduplicação, contrato |
| Integração (Backend) | pytest | Validação da API Gupy, Firebase |
| Resiliência (Backend) | pytest | Retry/backoff, JSON malformado, timeout |
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

### Backend (Scraper)

- **Python 3.8+**
- Gerenciador de pacotes `pip`

```bash
pip install requests firebase-admin python-dotenv
```

Configure o ambiente:
1. Crie a pasta `secrets/` na raiz do projeto
2. Coloque a chave de serviço do Firebase dentro de `secrets/`
3. Crie o arquivo `.env` na raiz:

```env
FIREBASE_KEY_PATH=secrets/firebase_key.json
FIREBASE_DB_URL=https://seu-projeto-default-rtdb.firebaseio.com
```

### Frontend (Web)

- **Node.js 18+**
- Gerenciador de pacotes `npm`

```bash
cd myorbita-web
npm install
```

Configure o ambiente:
1. Crie o arquivo `myorbita-web/.env`:

```env
VITE_FIREBASE_API_KEY=sua-api-key
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://seu-projeto-default-rtdb.firebaseio.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc
```

---

## 11. Como Executar

### Scraper — Execução manual
```bash
python main.py
```

O script processa todas as categorias em sequência, exibindo progresso em tempo real com métricas ao final.

### Scraper — Execução automatizada
O GitHub Actions executa o script automaticamente todo dia às 03:24 (horário de Brasília). Nenhuma ação manual é necessária após o setup inicial.

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
│   └── CLAUDE.md                   # Contexto para assistente IA
├── .github/
│   └── workflows/
│       └── scraper.yml             # GitHub Actions — execução diária + logs
├── myorbita-web/                  # Aplicação web React + Vite + TypeScript
│   ├── src/
│   │   ├── components/             # Header, VagaDetalhe, PageTransition, PlanetarySystem
│   │   ├── constants/              # colors.ts, typography.ts, routes.ts
│   │   ├── hooks/                  # useFiltrosVagas
│   │   ├── pages/                  # Home, VagasDev, VagasAdv
│   │   ├── services/               # api.ts, firebase.ts
│   │   ├── stores/                 # transitionStore (Zustand)
│   │   └── types/                  # IVaga.ts
│   └── .env                        # Variáveis Firebase Web (não versionado)
├── myorbita-mobile/               # React Native + Expo (planejado)
├── scrapers/
│   ├── __init__.py
│   ├── base_scraper.py             # Contrato abstrato + normalização + retry seletivo
│   └── gupy_scraper.py             # Implementação Gupy com paginação
├── tests/                          # Testes backend (pytest) — planejado
├── secrets/
│   └── *.json                      # Chave Firebase (não versionada)
├── .env                            # Variáveis backend (não versionado)
├── .gitignore
├── db_dev.json                     # Backup local — vagas de tecnologia
├── db_adv.json                     # Backup local — vagas de direito
├── main.py                         # Orquestrador principal com logging e métricas
├── queries_tecnologia.json         # 80 palavras-chave × 3 modalidades
├── queries_advogados.json          # 154 palavras-chave × 3 modalidades
├── PLANO_TESTES.md                 # Plano de testes automatizados (100+ casos)
└── README.md
```

---

*MyOrbita © 2026 — Todos os direitos reservados. Uso comercial proibido sem autorização expressa do autor.*