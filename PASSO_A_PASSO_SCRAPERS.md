# Passo a Passo — Scrapers MyOrbita (Gupy + LinkedIn)

**Projeto:** MyOrbita / MyOrbita — Agregador de Vagas (Tech + Jurídico)
**Stack:** Python + Firebase Realtime DB | React + TypeScript + Vite
**Deadline geral:** 20/06/2026
**Tempo estimado total:** 23–34 horas (~3–5 dias focados)

---

## Regra de Ouro

> **LinkedIn: testar viabilidade ANTES de codar.**
> Se bloqueio > 10% em qualquer etapa → pausar e avaliar alternativas (Trampar.io, Programathor, Remote OK).

---

## Resumo da Ordem de Execução

```
A1 → A2 → A3 → A4    (Gupy: auditar → atualizar → deploy → frontend)
         ↓
B1 → B2 → B3          (LinkedIn: acesso → seletores → rate limit)
         ↓
    [GO/NO-GO?]
         ↓
C1 → C2                (POC: parser local → normalização)
         ↓
D1 → D2 → D3           (Scraper completo → retry → Firebase)
         ↓
E1 → E2                (CI/CD → métricas)
         ↓
F1 → F2 → F3           (Frontend: merge → badge → filtro)
         ↓
    [CHECKLIST FINAL]
```

---

## BLOCO A — Gupy (Base Sólida) ≈ 5–8h

A Gupy já roda em produção. O objetivo aqui é completar os campos faltantes antes de partir pro LinkedIn.

---

### A1. Auditoria da API Gupy (2–3h)

**O quê:** Descobrir todos os campos que a API retorna e qual o % de preenchimento.

**Campos-alvo novos:** `city`, `state`, `country`, `jobLevel`, `disabilities` (PCD).

- [ ] Fazer request manual na API:
  ```bash
  curl "https://portal.api.gupy.io/api/job?jobName=desenvolvedor&limit=10" \
    -H "User-Agent: Mozilla/5.0" \
    > gupy_response.json
  ```
- [ ] Abrir `gupy_response.json`, copiar 1 objeto completo de vaga
- [ ] Montar tabela de campos (campo | tipo | exemplo | útil? | nota)
- [ ] Validar em 10 vagas diferentes — calcular % de preenchimento de `city`, `state`, `jobLevel`
- [ ] Criar arquivo `CAMPOS_GUPY.md` com tabela completa + % de preenchimento
- [ ] Commit: `docs: adiciona inventário de campos da API Gupy`

---

### A2. Atualizar Scraper Gupy (1–2h)

**O quê:** Capturar os campos novos identificados na auditoria.

**Onde:** `scrapers/gupy_scraper.py` — dentro do método que chama `self.padronizar_vaga(...)`.

- [ ] Adicionar mapeamento dos campos `city`, `state`, `country`, `jobLevel` no `padronizar_vaga`
- [ ] Usar `self._normalizar_campo(valor, default)` que já existe no `BaseScraper`
- [ ] Usar `self._normalizar_estado(nome)` para converter "São Paulo" → "SP" (27 estados já mapeados)
- [ ] Criar refs de teste no Firebase: `/vagas-dev-test`, `/vagas-adv-test`
- [ ] Apontar temporariamente o scraper para as refs de teste
- [ ] Rodar localmente: `python main.py` (ou `python scraper_gupy.py --test`)
- [ ] Validar no Firebase Console que `city` e `state` aparecem preenchidos
- [ ] Print do Firebase mostrando vaga com campos novos (evidência)
- [ ] Commit: `feat: adiciona campos city, state e jobLevel ao scraper Gupy`

---

### A3. Deploy Gupy Atualizado (30min)

**Checklist pré-deploy:**

- [ ] Campos novos aparecem no Firebase de teste
- [ ] Campos antigos não quebraram
- [ ] Tratamento de `null`/vazio funcionando (sem crash)

**Procedimento:**

- [ ] Remover flag de teste (voltar refs para `/vagas-dev` e `/vagas-adv`)
- [ ] Push para `main`
- [ ] Aguardar execução automática (03:42 BRT) ou forçar via Actions → Run workflow
- [ ] Validar logs do GitHub Actions: sucesso sem erros
- [ ] Validar Firebase Console: vagas novas têm campos `city`, `state`
- [ ] Commit: `chore: remove referências de teste do scraper Gupy`

---

### A4. Atualizar Frontend — Tipagem + Exibição (2–3h)

**O quê:** Preparar o frontend para consumir os campos novos.

**Tipagem:**

- [ ] Adicionar `city?: string` à interface `IVaga`
- [ ] Adicionar `state?: string` à interface `IVaga`
- [ ] Adicionar `country?: string` à interface `IVaga`
- [ ] Adicionar `jobLevel?: string` à interface `IVaga`
- [ ] Commit: `feat: adiciona campos de localização à interface IVaga`

**Exibição nos cards:**

- [ ] Exibir localização abaixo da empresa:
  ```tsx
  {vaga.city && vaga.state && (
    <p className="text-[11px] text-[#606080] mb-2">
      📍 {vaga.city}, {vaga.state}
    </p>
  )}
  ```
- [ ] Testar com vaga que tem localização e com vaga que não tem (não pode quebrar)
- [ ] Commit: `feat: exibe localização nos cards de vaga`

**Filtro de estados (estrutura):**

- [ ] Extrair estados únicos via `useMemo` + `Set`
- [ ] Preparar dropdown com `estadosDisponiveis.map(...)`
- [ ] Commit: `feat: prepara estrutura do filtro por estado`

---

## BLOCO B — LinkedIn: Reconhecimento e Viabilidade ≈ 3–5h

---

### B1. Testar Acesso Público (1–2h)

**O quê:** Determinar se é possível scraping sem autenticação.

- [ ] Fazer request manual via curl:
  ```bash
  curl "https://www.linkedin.com/jobs/search?keywords=desenvolvedor&location=Brasil" \
    -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
    -H "Accept-Language: pt-BR,pt;q=0.9" \
    -H "Referer: https://www.google.com/" \
    -v > linkedin_response.txt
  ```
- [ ] Analisar response code: 200? 302? 403?
- [ ] Checar headers: `X-LI-Track`, `Set-Cookie`, `CF-RAY` (Cloudflare)?
- [ ] Verificar se HTML contém vagas ou mensagem de login obrigatório
- [ ] Verificar se captcha aparece imediatamente
- [ ] Documentar decisão go/no-go:

| Resultado | Ação |
|---|---|
| 200 OK + HTML com vagas + sem captcha | ✅ GO → seguir para B2 |
| Redirect para login OU 403/429 no 1º request | ❌ STOP → avaliar alternativas |

- [ ] **DECISÃO:** ______ (GO / NO-GO / CAUTELA)

---

### B2. Mapear Estrutura HTML (1–2h)

**O quê:** Identificar seletores CSS dos cards de vaga.

- [ ] Abrir `linkedin.com/jobs/search?keywords=python&location=Brasil` no navegador
- [ ] Inspecionar 1 card de vaga — anotar seletores CSS:
  - Card: `.job-search-card`
  - Título: `.job-search-card__title`
  - Empresa: `.job-search-card__company-name`
  - Localização: `.job-search-card__location`
  - Link: `.job-search-card__link-wrapper` (atributo `href`)
- [ ] Recarregar página 3 vezes — verificar se classes permanecem iguais
- [ ] Salvar HTML de 3 vagas diferentes como `.html` local (remoto, híbrido, presencial)
- [ ] Documentar seletores confirmados (atualizar lista acima se mudaram)

**Alerta:** Se classes mudarem entre recarregamentos → HTML dinâmico → dificuldade alta.

---

### B3. Testar Rate Limiting (1h)

**O quê:** Descobrir quantos requests consecutivos aguentam antes de bloqueio.

- [ ] Criar script Python com 5 requests espaçados por 6 segundos
- [ ] Executar e registrar resultado de cada request (status code)
- [ ] Anotar quantos requests consecutivos funcionaram: ______
- [ ] Identificar delay mínimo entre requests: ______ segundos
- [ ] Verificar se cookies mudam entre requests
- [ ] Documentar decisão:

| Resultado | Ação |
|---|---|
| 5+ requests sem bloqueio | ✅ GO → seguir para C1 |
| Bloqueia após 3–4 | ⚠️ CAUTELA → aumentar delay |
| Bloqueia no 2º request | ❌ NO-GO → inviável sem proxy |

- [ ] **DECISÃO:** ______ (GO / NO-GO / CAUTELA)

---

## BLOCO C — LinkedIn: POC Parser (se B passou) ≈ 4–5h

---

### C1. Parser Local com lxml (2–3h)

**O quê:** Validar extração de dados usando os HTMLs salvos em B2 (sem requests reais).

- [ ] Criar função `parse_vaga_linkedin(html_content) -> dict`
- [ ] Usar `lxml.html.fromstring()` + XPath com os seletores confirmados em B2
- [ ] Testar com HTML de vaga remota
- [ ] Testar com HTML de vaga híbrida
- [ ] Testar com HTML de vaga presencial
- [ ] Validar: todos os campos extraídos corretamente? Campos vazios tratados?
- [ ] Commit: `feat: implementa parser local para vagas LinkedIn`

---

### C2. Normalização de Dados (1–2h)

**O quê:** Converter dados brutos do LinkedIn para o formato `padronizar_vaga()` do `BaseScraper`.

- [ ] Implementar mapa de modalidades: `Remote` → `Remoto`, `On-site` → `Presencial`, `Hybrid` → `Híbrido`
- [ ] Implementar parser de localização: "São Paulo, São Paulo, Brasil" → `city="São Paulo"`, `state="SP"`
  - Usar `_normalizar_estado()` do `BaseScraper` (27 estados já mapeados)
- [ ] Confirmar que `gerar_id_deterministico(link)` do `BaseScraper` funciona com links LinkedIn
- [ ] Testar normalização com dados reais dos 3 HTMLs
- [ ] Validar que output tem as 15 chaves do `padronizar_vaga`
- [ ] Commit: `feat: adiciona normalização de dados LinkedIn para formato padrão`

---

## BLOCO D — LinkedIn: Scraper Completo (se C passou) ≈ 8–12h

---

### D1. Scraper com Session + Anti-Detecção (4–5h)

**O quê:** Criar `scrapers/linkedin_scraper.py` herdando `BaseScraper`.

**Requisitos obrigatórios (do prompt inicial):**

- [ ] Herda `BaseScraper`
- [ ] Implementa `buscar_vagas(palavra_chave, modalidade)`
- [ ] Retorna dados via `self.padronizar_vaga(...)` (15 chaves padronizadas)
- [ ] Usa `self.fazer_requisicao_segura()` (Exponential Backoff + Jitter)
- [ ] Commit: `feat: cria estrutura base do LinkedinScraper herdando BaseScraper`

**Paginação:**

- [ ] Implementar paginação inteligente (seguir padrão do `gupy_scraper.py`)
- [ ] Commit: `feat: implementa buscar_vagas com paginação no LinkedIn`

**Anti-detecção:**

- [ ] Pool de User-Agents (3+ variações)
- [ ] Session com cookies persistentes
- [ ] Headers realistas (`Accept-Language`, `Referer`, `Accept`)
- [ ] Simulação de navegação: homepage → /jobs/ → busca real (delays 3–7s entre cada)
- [ ] Paginação em ordem aleatória (`random.shuffle`)
- [ ] Pausas longas a cada 30 vagas (2–5 minutos)
- [ ] Commit: `feat: adiciona anti-detecção ao scraper LinkedIn`

**Validação:**

- [ ] Scraper retorna 10+ vagas com dados corretos

---

### D2. Tratamento de Erros e Retry (2h)

**O quê:** Detecção de bloqueios + retry inteligente.

- [ ] 200 → sucesso
- [ ] 429 → ler `Retry-After`, pausar, tentar de novo
- [ ] 403 → ABORT (bloqueio permanente)
- [ ] 5xx → backoff exponencial (já existe no `BaseScraper.fazer_requisicao_segura`)
- [ ] Logging integrado com módulo dual (terminal UTF-8 + arquivo) do projeto
- [ ] Testar cenário de 429 (simular ou esperar acontecer)
- [ ] Commit: `feat: adiciona tratamento de erros e retry ao LinkedIn scraper`

---

### D3. Integração com Firebase (2–3h)

**O quê:** Salvar vagas LinkedIn no Firebase com deduplicação.

**Caminho dos dados:** `/vagas-dev-linkedin` e `/vagas-adv-linkedin` (separados da Gupy).

- [ ] Salvar em `/vagas-dev-linkedin-test` primeiro (coleção de teste)
- [ ] Validar estrutura idêntica à da Gupy no Firebase Console
- [ ] Deduplicação 3 níveis integrada:
  - [ ] Nível 1: URL já vista nesta execução (set em memória)
  - [ ] Nível 2: ID já existe no Firebase (cache pré-carregado)
  - [ ] Nível 3: ID determinístico (mesmo link → mesmo hash)
- [ ] 20+ vagas LinkedIn salvas no Firebase de teste (evidência)
- [ ] Commit: `feat: integra LinkedIn scraper com Firebase`

**Integração com orquestrador:**

- [ ] Adicionar `"linkedin": LinkedinScraper()` no dict `SCRAPERS_DISPONIVEIS` do `main.py`
- [ ] Adicionar `"linkedin"` na lista `plataformas_alvo` dos JSONs de queries
- [ ] Apontar para coleções de produção
- [ ] Commit: `feat: adiciona LinkedIn ao orquestrador main.py`

---

## BLOCO E — Automação + Monitoramento ≈ 2–3h

---

### E1. GitHub Actions — Workflow Separado (1–2h)

**O quê:** Criar `.github/workflows/linkedin-scraper.yml` isolado do Gupy.

- [ ] Cron: `30 4 * * *` (04:30 BRT — 30min depois da Gupy)
- [ ] `workflow_dispatch` para execução manual
- [ ] Timeout: 120min
- [ ] Deps: `pip install requests lxml firebase-admin`
- [ ] Upload de logs como artifact (`linkedin_scraper.log`)
- [ ] Secret: `FIREBASE_CREDENTIALS` (mesmo do Gupy)
- [ ] Testar execução manual via Actions → Run workflow
- [ ] Validar logs: sucesso sem erros
- [ ] Commit: `ci: adiciona workflow GitHub Actions para scraper LinkedIn`

---

### E2. Métricas e Alertas (1h)

**O quê:** `ScraperMetrics` com resumo de execução + alerta se taxa de erro > 20%.

- [ ] Implementar classe `ScraperMetrics` (vagas scraped, requests feitos, erros, duração)
- [ ] Método `finalizar()` com log de resumo
- [ ] Alerta via webhook (Slack/Discord) se `taxa_erro > 20%`
- [ ] Configurar `WEBHOOK_URL` como env var / GitHub Secret
- [ ] Enviar 1 alerta de teste (validar que chega)
- [ ] Commit: `feat: adiciona métricas e alertas ao scraper LinkedIn`

---

## BLOCO F — Frontend: Merge Multi-Fonte ≈ 2–3h

---

### F1. Buscar Vagas de Ambas as Fontes (1h)

**O quê:** Atualizar `src/services/api.ts` para buscar Gupy + LinkedIn simultaneamente.

- [ ] Fetch `/vagas-{route}` (Gupy)
- [ ] Fetch `/vagas-{route}-linkedin` (LinkedIn)
- [ ] Mergear arrays
- [ ] Ordenar por `data_publicacao` (mais recente primeiro)
- [ ] Testar: vagas de ambas as fontes aparecem na listagem
- [ ] Commit: `feat: busca vagas de Gupy e LinkedIn simultaneamente`

---

### F2. Badge de Origem nos Cards (30min)

**O quê:** Indicador visual Gupy (azul claro `#4FC3F7`) vs LinkedIn (azul `#0077B5`) nos cards.

- [ ] Verificar se badge já funciona com `origem: "LinkedIn"` (frontend já suporta)
- [ ] Ajustar estilo/cor se necessário
- [ ] Testar visual com vagas de ambas as origens lado a lado
- [ ] Commit: `feat: estiliza badge de origem Gupy/LinkedIn nos cards`

---

### F3. Filtro por Origem — Opcional (1h)

**O quê:** Toggle "Todas as fontes" / "Gupy" / "LinkedIn".

- [ ] Criar state `filtroOrigem` com valores `'todas' | 'Gupy' | 'LinkedIn'`
- [ ] Adicionar `.filter(v => v.origem === filtroOrigem)` no `useMemo` de `vagasFiltradas`
- [ ] Criar UI com botões toggle estilizados
- [ ] Testar: filtrar só Gupy, só LinkedIn, ambas
- [ ] Commit: `feat: adiciona filtro por origem (Gupy/LinkedIn)`

---

## Checklist de Validação Final

### Backend

- [ ] Gupy captura `city`, `state`, `jobLevel`
- [ ] LinkedIn funciona sem bloqueio excessivo (< 10% erros)
- [ ] Ambos salvam no Firebase em formato idêntico (15 chaves)
- [ ] Deduplicação 3 níveis funcionando
- [ ] GitHub Actions rodando diariamente (Gupy 03:42 + LinkedIn 04:30)
- [ ] Logs e alertas configurados

### Frontend

- [ ] Busca vagas de ambas as fontes
- [ ] Badge de origem exibido
- [ ] Filtros cross-plataforma funcionando
- [ ] `city`, `state` aparecem quando disponíveis
- [ ] Performance < 2s para 500+ vagas
- [ ] Campo vazio não quebra UI

### UX

- [ ] Mensagem clara quando não há vagas de determinada fonte
- [ ] Filtros intuitivos e responsivos

---

## Plano de Rollback

Se LinkedIn não for viável (bloqueio em B1/B2/B3):

- [ ] Manter só Gupy — já funciona e agora com campos completos
- [ ] Avaliar alternativas:
  - [ ] **Trampar.io** — scraping mais simples, agrega fontes
  - [ ] **Programathor** — API pública, focado tech
  - [ ] **Remote OK** — API pública, vagas remotas
- [ ] LinkedIn API oficial — ~$100/mês, só se o projeto escalar
