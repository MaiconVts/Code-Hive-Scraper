# MyOrbita — Plano de Testes Automatizados

> Documento vivo que mapeia todos os testes planejados, implementados e pendentes do projeto.

---

## Stack de Testes

| Ferramenta | Escopo | Justificativa |
|---|---|---|
| pytest | Backend (Python) | Framework padrão, fixtures, parametrize, cobertura |
| vitest | Frontend unitários (TypeScript) | Integrado ao Vite, rápido, compatível com React |
| Playwright | E2E, responsividade, segurança, regressão visual | Multi-browser, screenshots, viewports, rede |
| axe-core | Acessibilidade (WCAG) | Integra com Playwright, detecta violações automaticamente |

---

## Estrutura de Diretórios

```
MyOrbita-Scraper/
├── tests/                          # Testes do backend (pytest)
│   ├── __init__.py
│   ├── conftest.py                 # Fixtures compartilhadas
│   ├── unit/
│   │   ├── test_normalizar.py      # _normalizar_campo, _normalizar_estado
│   │   ├── test_mapeamentos.py     # _mapear_tipo_contrato, _mapear_modalidade, _mapear_workplace_legivel
│   │   ├── test_id.py              # gerar_id_deterministico
│   │   ├── test_deduplicacao.py    # filtrar_duplicadas (3 níveis)
│   │   └── test_padronizar.py      # padronizar_vaga (contrato de saída)
│   ├── integration/
│   │   ├── test_api_gupy.py        # Validar resposta real da API Gupy
│   │   └── test_firebase.py        # Validar leitura/escrita no Firebase (env de teste)
│   ├── contract/
│   │   └── test_contrato_vaga.py   # Saída do scraper bate com IVaga do frontend
│   └── resilience/
│       ├── test_retry.py           # Backoff em 429, abort em 403/404
│       ├── test_json_malformado.py # API retorna lixo → não crashar
│       └── test_timeout.py         # Request travado → timeout funciona
│
├── myorbita-web/
│   ├── src/
│   │   └── __tests__/              # Testes do frontend (vitest)
│   │       ├── unit/
│   │       │   ├── useFiltrosVagas.test.ts
│   │       │   ├── normalizarTexto.test.ts
│   │       │   ├── corPrazo.test.ts
│   │       │   ├── formatarData.test.ts
│   │       │   └── campoValido.test.ts
│   │       └── setup.ts            # Configuração do vitest
│   │
│   └── e2e/                        # Testes E2E (Playwright)
│       ├── responsividade.spec.ts
│       ├── seguranca.spec.ts
│       ├── usabilidade.spec.ts
│       ├── acessibilidade.spec.ts
│       ├── performance.spec.ts
│       ├── regressao-visual.spec.ts
│       ├── cross-browser.spec.ts
│       ├── resiliencia-ui.spec.ts
│       ├── seo.spec.ts
│       └── dados.spec.ts
```

---

## 1. Backend — Testes Unitários

### 1.1 Normalização de Campos (`test_normalizar.py`)

| # | Caso de Teste | Entrada | Saída Esperada | Status |
|---|---|---|---|---|
| 1 | Campo None retorna default | `None` | `"Não informado"` | 📋 Pendente |
| 2 | String vazia retorna default | `""` | `"Não informado"` | 📋 Pendente |
| 3 | String com espaços retorna default | `"   "` | `"Não informado"` | 📋 Pendente |
| 4 | String válida retorna trimada | `"  São Paulo  "` | `"São Paulo"` | 📋 Pendente |
| 5 | Booleano True passa direto | `True` | `True` | 📋 Pendente |
| 6 | Booleano False passa direto | `False` | `False` | 📋 Pendente |
| 7 | Inteiro passa direto | `42` | `42` | 📋 Pendente |
| 8 | Default customizado funciona | `None, default="Brasil"` | `"Brasil"` | 📋 Pendente |

### 1.2 Normalização de Estado (`test_normalizar.py`)

| # | Caso de Teste | Entrada | Saída Esperada | Status |
|---|---|---|---|---|
| 1 | Nome completo → sigla | `"São Paulo"` | `"SP"` | 📋 Pendente |
| 2 | Todos os 27 estados mapeados | Todos os nomes | Todas as siglas | 📋 Pendente |
| 3 | Sigla já passada retorna igual | `"MG"` | `"MG"` | 📋 Pendente |
| 4 | Vazio retorna "Não informado" | `""` | `"Não informado"` | 📋 Pendente |
| 5 | None retorna "Não informado" | `None` | `"Não informado"` | 📋 Pendente |
| 6 | Nome desconhecido retorna original | `"California"` | `"California"` | 📋 Pendente |

### 1.3 Mapeamentos (`test_mapeamentos.py`)

| # | Caso de Teste | Entrada | Saída Esperada | Status |
|---|---|---|---|---|
| 1 | CLT mapeado | `"vacancy_type_effective"` | `"CLT"` | 📋 Pendente |
| 2 | Estágio mapeado | `"vacancy_type_internship"` | `"Estágio"` | 📋 Pendente |
| 3 | PJ (contractor) mapeado | `"vacancy_type_independent_contractor"` | `"PJ"` | 📋 Pendente |
| 4 | PJ (legal entity) mapeado | `"vacancy_legal_entity"` | `"PJ"` | 📋 Pendente |
| 5 | Trainee mapeado | `"vacancy_type_trainee"` | `"Trainee"` | 📋 Pendente |
| 6 | Professor mapeado | `"vacancy_type_lecturer"` | `"Professor"` | 📋 Pendente |
| 7 | Terceirizado mapeado | `"vacancy_type_outsource"` | `"Terceirizado"` | 📋 Pendente |
| 8 | Valor desconhecido retorna original | `"vacancy_type_xyz"` | `"vacancy_type_xyz"` | 📋 Pendente |
| 9 | None retorna "Não informado" | `None` | `"Não informado"` | 📋 Pendente |
| 10 | Modalidade "remoto" → remote | `"Remoto"` | `"remote"` | 📋 Pendente |
| 11 | Modalidade "híbrido" → hybrid | `"Híbrido"` | `"hybrid"` | 📋 Pendente |
| 12 | Modalidade "presencial" → on-site | `"Presencial"` | `"on-site"` | 📋 Pendente |
| 13 | Workplace "remote" → Remoto | `"remote"` | `"Remoto"` | 📋 Pendente |
| 14 | Workplace "hybrid" → Híbrido | `"hybrid"` | `"Híbrido"` | 📋 Pendente |
| 15 | Workplace None → "Não informado" | `None` | `"Não informado"` | 📋 Pendente |
| 16 | Todos os valores do mapa cobertos | Todos | Todos | 📋 Pendente |

### 1.4 ID Determinístico (`test_id.py`)

| # | Caso de Teste | Entrada | Saída Esperada | Status |
|---|---|---|---|---|
| 1 | Mesmo link → mesmo ID sempre | `"https://example.com/vaga/1"` ×2 | IDs iguais | 📋 Pendente |
| 2 | Links diferentes → IDs diferentes | 2 links distintos | IDs distintos | 📋 Pendente |
| 3 | ID tem 16 caracteres | Qualquer link | `len(id) == 16` | 📋 Pendente |
| 4 | ID é hexadecimal válido | Qualquer link | Só chars `[0-9a-f]` | 📋 Pendente |

### 1.5 Deduplicação (`test_deduplicacao.py`)

| # | Caso de Teste | Entrada | Saída Esperada | Status |
|---|---|---|---|---|
| 1 | Vagas únicas passam todas | 3 vagas distintas | 3 únicas, 0 duplicadas | 📋 Pendente |
| 2 | Duplicatas intra-scraping filtradas | 2 vagas com mesmo link | 1 única, 1 duplicada | 📋 Pendente |
| 3 | Vagas já no Firebase contadas | Vaga com ID existente no set | Conta como `ja_firebase` | 📋 Pendente |
| 4 | Lista vazia retorna vazio | `[]` | 0 únicas, 0 duplicadas | 📋 Pendente |
| 5 | Mix de novos + duplicatas + firebase | 5 vagas mistas | Contagens corretas | 📋 Pendente |

### 1.6 Contrato de Saída (`test_padronizar.py`)

| # | Caso de Teste | Entrada | Saída Esperada | Status |
|---|---|---|---|---|
| 1 | Dict tem todas as 15 chaves | Chamada completa | Todas as chaves presentes | 📋 Pendente |
| 2 | Chaves batem com IVaga do frontend | Dict de saída | Mesmas chaves que `IVaga.ts` | 📋 Pendente |
| 3 | Campos opcionais com None → defaults | Chamada sem opcionais | Defaults corretos | 📋 Pendente |

---

## 2. Backend — Testes de Integração

### 2.1 API Gupy (`test_api_gupy.py`)

| # | Caso de Teste | O que valida | Status |
|---|---|---|---|
| 1 | Endpoint responde 200 | Disponibilidade da API | 📋 Pendente |
| 2 | Resposta contém chave `data` | Estrutura do JSON | 📋 Pendente |
| 3 | Resposta contém chave `pagination` | Paginação disponível | 📋 Pendente |
| 4 | Objeto de vaga tem campos esperados | `name`, `jobUrl`, `workplaceType`, `type`, `city`, `state` | 📋 Pendente |
| 5 | `pagination.total` é inteiro positivo | Tipo de dado correto | 📋 Pendente |
| 6 | Campos novos existem na resposta | `isRemoteWork`, `disabilities`, `applicationDeadline` | 📋 Pendente |

---

## 3. Backend — Testes de Resiliência

### 3.1 Retry e Backoff (`test_retry.py`)

| # | Caso de Teste | O que simula | Saída Esperada | Status |
|---|---|---|---|---|
| 1 | HTTP 429 → retry com backoff | Mock 429 nas 2 primeiras, 200 na 3ª | Retorna response válida | 📋 Pendente |
| 2 | HTTP 403 → aborta imediatamente | Mock 403 | Retorna sem retry | 📋 Pendente |
| 3 | HTTP 404 → aborta imediatamente | Mock 404 | Retorna sem retry | 📋 Pendente |
| 4 | HTTP 500 → retry | Mock 500 + 200 | Retorna na 2ª tentativa | 📋 Pendente |
| 5 | Todas as tentativas falham → raise | Mock 429 × 4 | Lança exceção | 📋 Pendente |

### 3.2 JSON Malformado (`test_json_malformado.py`)

| # | Caso de Teste | O que simula | Saída Esperada | Status |
|---|---|---|---|---|
| 1 | API retorna HTML ao invés de JSON | Response com texto HTML | Retorna lista vazia, não crashar | 📋 Pendente |
| 2 | API retorna JSON sem chave `data` | `{"error": "not found"}` | Retorna lista vazia | 📋 Pendente |
| 3 | Vaga sem `jobUrl` é ignorada | Item sem link | Vaga não incluída na lista | 📋 Pendente |

### 3.3 Timeout (`test_timeout.py`)

| # | Caso de Teste | O que simula | Saída Esperada | Status |
|---|---|---|---|---|
| 1 | Request travado → timeout | Mock com delay > 15s | Lança exceção no timeout | 📋 Pendente |

---

## 4. Frontend — Testes Unitários (Vitest)

### 4.1 Hook `useFiltrosVagas` (`useFiltrosVagas.test.ts`)

| # | Caso de Teste | O que valida | Status |
|---|---|---|---|
| 1 | Sem filtros retorna todas as vagas | Estado inicial | 📋 Pendente |
| 2 | Busca por título filtra corretamente | `busca = "React"` | 📋 Pendente |
| 3 | Busca ignora acentos | `busca = "estagio"` encontra "Estágio" | 📋 Pendente |
| 4 | Busca multi-termo (AND) | `busca = "React Senior"` | 📋 Pendente |
| 5 | Filtro modalidade Remoto | Só vagas remotas | 📋 Pendente |
| 6 | Filtro modalidade toggle (ativa/desativa) | Clica 2x volta ao normal | 📋 Pendente |
| 7 | Filtro por estado | `filtroEstado = "SP"` | 📋 Pendente |
| 8 | Filtro por contrato | `filtroContrato = "CLT"` | 📋 Pendente |
| 9 | Filtro PCD | `filtroPcd = true` | 📋 Pendente |
| 10 | Filtros combinados | Remoto + SP + CLT + PCD | 📋 Pendente |
| 11 | Ordenação recente | Mais nova primeiro | 📋 Pendente |
| 12 | Ordenação antiga | Mais velha primeiro | 📋 Pendente |
| 13 | Paginação retorna 9 por página | `vagasPagina.length <= 9` | 📋 Pendente |
| 14 | Página reseta ao mudar filtro | Muda filtro → `paginaAtual === 1` | 📋 Pendente |
| 15 | `estadosDisponiveis` extrai valores únicos | Vagas com SP, MG, SP | `["MG", "SP"]` | 📋 Pendente |
| 16 | `contratosDisponiveis` ignora "Não informado" | Vagas com CLT + "Não informado" | `["CLT"]` | 📋 Pendente |
| 17 | Busca em city/state/tipo_contrato | `busca = "São Paulo"` | 📋 Pendente |

### 4.2 Utilitários (`normalizarTexto.test.ts`, `corPrazo.test.ts`, etc.)

| # | Caso de Teste | Entrada | Saída Esperada | Status |
|---|---|---|---|---|
| 1 | Remove acentos | `"Estágio Júnior"` | `"estagio junior"` | 📋 Pendente |
| 2 | Lowercase | `"REACT"` | `"react"` | 📋 Pendente |
| 3 | Trim | `"  texto  "` | `"texto"` | 📋 Pendente |
| 4 | String vazia | `""` | `""` | 📋 Pendente |
| 5 | Prazo futuro (>7 dias) → verde | `"2026-12-31"` | `cor: "#34D399"` | 📋 Pendente |
| 6 | Prazo próximo (≤7 dias) → amarelo | Hoje + 3 dias | `cor: "#FFB703"` | 📋 Pendente |
| 7 | Prazo expirado → vermelho | `"2020-01-01"` | `cor: "#F87171", texto: "expirada"` | 📋 Pendente |
| 8 | Data válida formatada | `"2026-04-17T22:54:32.035Z"` | `"17/04/2026"` | 📋 Pendente |
| 9 | Data vazia → traço | `""` | `"—"` | 📋 Pendente |
| 10 | campoValido com null | `null` | `false` | 📋 Pendente |
| 11 | campoValido com "Não informado" | `"Não informado"` | `false` | 📋 Pendente |
| 12 | campoValido com valor real | `"São Paulo"` | `true` | 📋 Pendente |

---

## 5. E2E — Responsividade (Playwright)

### 5.1 Viewports Testados

| Dispositivo | Largura | Altura | Categoria |
|---|---|---|---|
| iPhone SE | 320px | 568px | Mobile pequeno |
| iPhone 14 | 390px | 844px | Mobile padrão |
| iPad Mini | 768px | 1024px | Tablet |
| iPad Pro | 1024px | 1366px | Tablet grande |
| Laptop | 1366px | 768px | Desktop médio |
| Full HD | 1920px | 1080px | Desktop padrão |

### 5.2 Casos de Teste (`responsividade.spec.ts`)

| # | Caso de Teste | Viewports | O que valida | Status |
|---|---|---|---|---|
| 1 | Sem scroll horizontal | Todos | `document.scrollingElement.scrollWidth <= viewport.width` | 📋 Pendente |
| 2 | Header não corta conteúdo | Todos | Título visível abaixo do header | 📋 Pendente |
| 3 | Hamburger aparece em mobile | ≤520px | Botão hamburger visível, nav escondida | 📋 Pendente |
| 4 | Nav aparece em desktop | >520px | Links visíveis, hamburger escondido | 📋 Pendente |
| 5 | Filtros grid adapta colunas | Todos | 4 cols (desktop), 2 cols (tablet), 1 col (mobile) | 📋 Pendente |
| 6 | Cards grid adapta colunas | Todos | 3 cols (desktop), 2 cols (tablet), 1 col (mobile) | 📋 Pendente |
| 7 | Texto não corta nos filtros | ≤480px | Labels dos selects legíveis | 📋 Pendente |
| 8 | Botões de modalidade não estouram | 320px | Todos visíveis sem scroll | 📋 Pendente |
| 9 | Paginação não estoura | 320px | Botões acessíveis | 📋 Pendente |
| 10 | Modal VagaDetalhe cabe na tela | Todos | Não ultrapassa viewport | 📋 Pendente |

---

## 6. E2E — Segurança (Playwright)

### 6.1 Casos de Teste (`seguranca.spec.ts`)

| # | Caso de Teste | O que valida | Status |
|---|---|---|---|
| 1 | firebase.ts não tem chaves hardcoded | Grep no código-fonte por API keys | 📋 Pendente |
| 2 | .env não é servido pelo Vite | Fetch `/.env` retorna 404 | 📋 Pendente |
| 3 | secrets/ não é acessível | Fetch `/secrets/` retorna 404 | 📋 Pendente |
| 4 | Inputs sanitizam XSS | Injetar `<script>alert(1)</script>` na busca | 📋 Pendente |
| 5 | Links externos têm rel="noopener noreferrer" | Todos os `<a target="_blank">` | 📋 Pendente |
| 6 | Sem console.log exposto em produção | Build de produção não tem logs | 📋 Pendente |
| 7 | Firebase Rules restringem escrita | Tentar write sem auth → denied | 📋 Pendente |
| 8 | Service account não está no bundle | Grep no build por chave privada | 📋 Pendente |

---

## 7. E2E — Usabilidade (Playwright)

### 7.1 Casos de Teste (`usabilidade.spec.ts`)

| # | Caso de Teste | O que valida | Status |
|---|---|---|---|
| 1 | Filtros resetam ao trocar página | Navegar Dev → Adv → Dev | 📋 Pendente |
| 2 | Loading aparece enquanto carrega | Spinner visível antes dos cards | 📋 Pendente |
| 3 | Estado vazio mostra mensagem | Filtrar impossível → mensagem | 📋 Pendente |
| 4 | Card abre modal ao clicar | Click no card → modal visível | 📋 Pendente |
| 5 | Modal fecha ao clicar fora | Click no overlay → modal fecha | 📋 Pendente |
| 6 | Modal fecha com botão X | Click no X → modal fecha | 📋 Pendente |
| 7 | "Ver Vaga Completa" abre link externo | Botão tem href correto + target blank | 📋 Pendente |
| 8 | Paginação navega corretamente | Click página 2 → mostra vagas 10-18 | 📋 Pendente |
| 9 | Busca filtra em tempo real | Digitar "React" → cards filtram | 📋 Pendente |
| 10 | Contador atualiza com filtros | Mudar filtro → número muda | 📋 Pendente |

---

## 8. E2E — Acessibilidade (Playwright + axe-core)

### 8.1 Casos de Teste (`acessibilidade.spec.ts`)

| # | Caso de Teste | O que valida | Status |
|---|---|---|---|
| 1 | Sem violações WCAG nível A | axe-core scan da página inteira | 📋 Pendente |
| 2 | Contraste de texto suficiente | Ratio ≥ 4.5:1 para texto normal | 📋 Pendente |
| 3 | Área de toque mínima | Botões ≥ 44x44px | 📋 Pendente |
| 4 | Navegação por teclado (Tab) | Foco visível em todos os interativos | 📋 Pendente |
| 5 | Inputs têm labels acessíveis | aria-label ou label associado | 📋 Pendente |
| 6 | Imagens têm alt text | Todas as `<img>` com alt | 📋 Pendente |
| 7 | Heading hierarchy correta | h1 → h2 → h3 sem pular | 📋 Pendente |
| 8 | Modal trap focus | Tab dentro do modal não sai | 📋 Pendente |

---

## 9. E2E — Performance (Playwright)

### 9.1 Casos de Teste (`performance.spec.ts`)

| # | Caso de Teste | Threshold | O que valida | Status |
|---|---|---|---|---|
| 1 | First Contentful Paint | < 2s | Primeiro conteúdo visível | 📋 Pendente |
| 2 | Largest Contentful Paint | < 3s | Maior elemento visível | 📋 Pendente |
| 3 | Firebase response time | < 2s | Tempo de carregamento dos dados | 📋 Pendente |
| 4 | 500+ vagas renderizam sem travar | < 5s | Scroll suave após render | 📋 Pendente |
| 5 | Filtros respondem instantaneamente | < 100ms | Não tem delay perceptível | 📋 Pendente |
| 6 | Build size razoável | < 500KB gzip | Bundle não está inchado | 📋 Pendente |

---

## 10. E2E — Regressão Visual (Playwright)

### 10.1 Casos de Teste (`regressao-visual.spec.ts`)

| # | Caso de Teste | Viewports | O que valida | Status |
|---|---|---|---|---|
| 1 | Screenshot Home | Todos | Pixel match com baseline | 📋 Pendente |
| 2 | Screenshot Vagas Dev | Todos | Pixel match com baseline | 📋 Pendente |
| 3 | Screenshot Vagas Adv | Todos | Pixel match com baseline | 📋 Pendente |
| 4 | Screenshot VagaDetalhe modal | Desktop + Mobile | Pixel match com baseline | 📋 Pendente |
| 5 | Screenshot filtros ativos | Desktop | Botão ativo + cards filtrados | 📋 Pendente |

---

## 11. E2E — Cross-Browser (Playwright)

### 11.1 Browsers Testados

| Browser | Engine | Status |
|---|---|---|
| Chromium | Blink | 📋 Pendente |
| Firefox | Gecko | 📋 Pendente |
| WebKit | WebKit (Safari) | 📋 Pendente |

### 11.2 Casos de Teste (`cross-browser.spec.ts`)

| # | Caso de Teste | O que valida | Status |
|---|---|---|---|
| 1 | Página carrega sem erros | Console sem errors em todos os browsers | 📋 Pendente |
| 2 | Filtros funcionam | Todos os filtros operam em todos os browsers | 📋 Pendente |
| 3 | Backdrop-filter renderiza | Blur visível nos cards/filtros | 📋 Pendente |
| 4 | Fontes carregam | Space Grotesk renderiza corretamente | 📋 Pendente |

---

## 12. E2E — Resiliência de UI (Playwright)

### 12.1 Casos de Teste (`resiliencia-ui.spec.ts`)

| # | Caso de Teste | O que simula | Saída Esperada | Status |
|---|---|---|---|---|
| 1 | Firebase offline | Interceptar request → timeout | Mensagem de erro, não crash | 📋 Pendente |
| 2 | Firebase retorna vazio | Mock response `{}` | Estado vazio com mensagem | 📋 Pendente |
| 3 | Vaga com campos null | Card com todos os opcionais null | Renderiza sem quebrar | 📋 Pendente |
| 4 | Vaga com título gigante | Título com 200+ chars | Texto trunca, card não estoura | 📋 Pendente |
| 5 | Vaga sem link | `link: ""` | Botão desabilitado ou escondido | 📋 Pendente |

---

## 13. Integridade de Dados (Playwright + API)

### 13.1 Casos de Teste (`dados.spec.ts`)

| # | Caso de Teste | O que valida | Status |
|---|---|---|---|
| 1 | Sem vagas duplicadas no Firebase | IDs únicos após execução completa | 📋 Pendente |
| 2 | Todos os links são URLs válidas | Regex de URL em todos os links | 📋 Pendente |
| 3 | Datas de publicação são válidas | Parse sem erro | 📋 Pendente |
| 4 | Nenhum campo obrigatório é null | id, titulo, empresa, link preenchidos | 📋 Pendente |

---

## 14. SEO e Meta (Playwright)

### 14.1 Casos de Teste (`seo.spec.ts`)

| # | Caso de Teste | O que valida | Status |
|---|---|---|---|
| 1 | Title tag presente | `<title>` não vazio | 📋 Pendente |
| 2 | Meta description presente | `<meta name="description">` | 📋 Pendente |
| 3 | Open Graph tags | og:title, og:description, og:image | 📋 Pendente |
| 4 | Heading hierarchy | Exatamente 1 h1 por página | 📋 Pendente |
| 5 | Links internos funcionam | Nenhum link quebrado | 📋 Pendente |

---

## Execução

### Comandos

```bash
# Backend — todos os testes
pytest tests/ -v

# Backend — só unitários
pytest tests/unit/ -v

# Backend — com cobertura
pytest tests/ --cov=scrapers --cov-report=html

# Frontend — unitários
cd myorbita-web && npx vitest run

# Frontend — E2E
cd myorbita-web && npx playwright test

# Frontend — E2E com UI
cd myorbita-web && npx playwright test --ui

# Tudo junto (CI)
pytest tests/ -v && cd myorbita-web && npx vitest run && npx playwright test
```

### GitHub Actions (futuro)

```yaml
# Adicionar ao workflow existente ou criar workflow separado
- name: Rodar testes backend
  run: pytest tests/ -v

- name: Rodar testes frontend
  run: |
    cd myorbita-web
    npm ci
    npx vitest run
    npx playwright install --with-deps
    npx playwright test
```

---

## Métricas de Cobertura Alvo

| Camada | Cobertura Alvo | Atual |
|---|---|---|
| Backend unitários | 90%+ | 0% |
| Frontend unitários | 80%+ | 0% |
| E2E responsividade | 100% dos viewports | 0% |
| E2E segurança | 100% dos checks | 0% |
| Acessibilidade WCAG A | 0 violações | Não medido |

---

*Última atualização: Abril 2026*
