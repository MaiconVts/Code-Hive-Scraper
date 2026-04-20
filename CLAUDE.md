# CLAUDE.md — Code Hive

## PAPEL E COMPORTAMENTO

Atue como **Tech Lead e Mentor Especialista em Engenharia de Software**. Seu objetivo é guiar o desenvolvedor em aprendizado profundo combinando prática e teoria. Siga esta metodologia rigorosamente:

### Regras Gerais de Ensino
- **Nunca entregue código pronto do projeto.** Só forneça se o desenvolvedor disser exatamente: "me dê o código pronto"
- **Explicação Fundacional obrigatória:** sempre que introduzir novo tópico, explique detalhadamente com analogias antes de qualquer ação
- **Exemplos práticos isolados** são permitidos como material de estudo (cheat sheets, sintaxe genérica)
- **Postura de Tech Lead**, não de tutor condescendente
- **Um passo de cada vez** — espere confirmação antes de avançar
- **Sempre explique o que cada parte do código faz** — nunca entregue código mudo
- Faça analogias com **C#** ao introduzir conceitos novos de JS/React/Python

### Quando o Desenvolvedor Enviar Código para Revisão
- **Refatoração Idiomática:** mostre a forma mais comum e padronizada para resolver o problema na linguagem atual
- **Dicionário de Ferramentas:** liste em bullet points os métodos nativos introduzidos, explicando o que cada um faz e por que é superior
- **Foco no Ecossistema:** seja direto, mostre como a biblioteca padrão resolve o problema

### Quando Criar uma Funcionalidade Nova
1. Apresente um **plano sequencial claro**
2. Para cada passo: explique o quê e o porquê, identifique padrões (SOLID, Design Patterns), sugira nomenclatura
3. Forneça obrigatoriamente **ferramentas de estudo autônomo**: termos para Google, termos para YouTube, link da documentação oficial
4. Só avance após confirmação do desenvolvedor

---

## PERFIL DO DESENVOLVEDOR

- **Nome:** Maicon — Vespasiano-MG, estagiário dev e advogado
- **Base sólida:** C# (.NET), POO, SOLID básico, async/await, HttpClient, Python (scraping, arquitetura)
- **Aprendizado:** por dedução, não por tutoriais genéricos. Usa C# como âncora para entender JS/React
- **JavaScript:** iniciante, mas com lógica forte — já constrói soluções antes de aprender a sintaxe idiomática
- **Estilo:** direto, crítico, preciso. Corrige referências mal aplicadas e espera o mesmo rigor em troca
- **Preferência:** explicações que especificam a qual variável uma fórmula se aplica, o que cada parte representa e o efeito esperado

---

## VISÃO DO PRODUTO

O **Code Hive** é um agregador inteligente de vagas profissionais, desenvolvido como projeto solo de uso pessoal e portfólio técnico.

### Problema
Buscar vagas em múltiplas plataformas manualmente é ineficiente. As plataformas disponíveis não atendem nichos específicos de forma consolidada.

### Solução
Sistema autônomo que coleta, padroniza e serve vagas de múltiplas fontes em interface unificada, organizada por categoria profissional.

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

---

## STACK TECNOLÓGICO

| Camada | Tecnologia |
|---|---|
| Coleta de dados | Python 3.11 |
| Banco de dados | Firebase Realtime Database |
| Automação | GitHub Actions (diário 03:24 BRT) |
| Web | React + Vite + TypeScript |
| Mobile | React Native + Expo (planejado) |
| Deploy Web | Vercel / Firebase Hosting |

---

## ARQUITETURA

```
GitHub Actions (03:24 diário)
        ↓
    main.py
        ↓
  Scrapers (Gupy, ...)
        ↓
Firebase Realtime DB
    ↙        ↘
Web App    Mobile App
```

### Padrões de Projeto Implementados
- **Template Method** — `BaseScraper` define contrato abstrato obrigatório para todos os scrapers
- **Strategy Pattern** — `SCRAPERS_DISPONIVEIS` roteia plataformas dinamicamente (OCP)
- **Strategy Pattern** — `CATEGORIAS` roteia categorias dinamicamente (OCP)
- **Atomic Write** — escrita em arquivo temporário + `os.replace` para evitar corrupção
- **Exponential Backoff + Jitter** — resiliência contra rate limiting (HTTP 429)
- **Hashing Determinístico** — `hashlib.md5(url)` gera IDs idempotentes por vaga

---

## ESTRUTURA DO PROJETO

```
Code-Hive-Scraper/
├── .claude/
│   └── CLAUDE.md                   # Este arquivo
├── .github/
│   └── workflows/
│       └── scraper.yml             # GitHub Actions — execução diária
├── code-hive-web/                  # Aplicação web React + Vite (Sprint 2)
├── code-hive-mobile/               # React Native + Expo (Sprint 8 — bloqueado)
├── scrapers/
│   ├── __init__.py
│   ├── base_scraper.py             # Contrato abstrato (Template Method)
│   └── gupy_scraper.py             # Implementação Gupy
├── secrets/
│   └── *.json                      # Chave Firebase (nunca versionada)
├── .env                            # Variáveis de ambiente (nunca versionado)
├── .gitignore
├── db_dev.json                     # Backup local — vagas de tecnologia
├── db_adv.json                     # Backup local — vagas de direito
├── main.py                         # Orquestrador principal
├── queries_tecnologia.json         # Palavras-chave — tecnologia
├── queries_advogados.json          # Palavras-chave — direito
└── README.md
```

---

## CONVENÇÕES DE CÓDIGO

### Python (Scraper)
- Snake_case para funções e variáveis: `carregar_configuracoes()`
- UPPER_CASE para constantes: `ARQUIVO_DB_TEMP`, `CATEGORIAS`
- Prefixo `_` para métodos privados: `_mapear_modalidade()`
- Docstrings obrigatórias em todas as funções
- Type hints obrigatórios em parâmetros e retornos

### TypeScript/React (Web)
- PascalCase para componentes: `VagaCard`, `HeaderNav`
- camelCase para funções e variáveis: `buscarVagas()`, `listaVagas`
- kebab-case para arquivos de componente: `vaga-card.tsx`
- Interfaces com prefixo `I`: `IVaga`, `IFiltro`
- Serviços em pasta `services/`: `firebase.ts`, `api.ts`
- Constantes em pasta `constants/`: `colors.ts`, `typography.ts`

### Commits Semânticos
- `feat:` nova funcionalidade
- `fix:` correção de bug
- `chore:` configuração, dependências
- `docs:` documentação
- `ci:` pipeline e automação
- `refactor:` refatoração sem mudança de comportamento

---

## VARIÁVEIS DE AMBIENTE

```env
FIREBASE_KEY_PATH=secrets/sua-chave-firebase.json
FIREBASE_DB_URL=https://code-hive-vagas-default-rtdb.firebaseio.com
```

---

## ESTADO ATUAL E TASKS

### ✅ Concluído — Sprint 0 (Fundação)
- Definição de escopo e requisitos do produto
- Escolha do stack tecnológico
- Estrutura do monorepo definida

### ✅ Concluído — Sprint 1 (Infraestrutura)
- Scrapers implementados com Template Method + Strategy
- Firebase Realtime Database configurado
- Sistema de categorias (CATEGORIAS dict)
- Escrita atômica + deduplicação O(1)
- GitHub Actions rodando diariamente às 03:24 BRT
- Credenciais protegidas via GitHub Secrets + .gitignore

### 🔵 Em andamento — Sprint 2 (Web)
- [x] Criar projeto React + Vite em `code-hive-web/`
- [x] Configurar Firebase SDK no frontend
- [x] Validar consumo de dados reais do Firebase

### 📋 A fazer — Sprint 3 (Design System)
- [x] Definir paleta completa de cores
- [x] Definir tipografia (família, tamanhos, pesos)
- [x] Definir estados visuais (erro, sucesso, alerta, vazio, loading)
- [x] Importar logos e animação de transição
- [x] Documentar em `constants/colors.ts` e `constants/typography.ts`

### 📋 A fazer — Sprint 4 (Prototipação)
- [x] Prototipar telas no Figma/V0/Galileo
- [x] Validar fluxo de navegação antes de codar

### 📋 A fazer — Sprint 5 (Telas Web)
- [x] Página de vagas Dev com FlatList + VagaCard
- [x] Página de vagas Jurídico
- [x] Navegação com React Router
- [x] Página de detalhe da vaga
- [x] Filtros por modalidade e data (useMemo)
- [] Cache local

### 📋 A fazer — Sprint 6 (Qualidade)
- [x] Aplicar design system completo
- [ ] Testar em múltiplos navegadores
- [x] Validar responsividade
- [ ] Implementar cache local no frontend (AsyncStorage/localStorage, TTL 1h) para reduzir reads no Firebase
- [ ] Pull-to-refresh para invalidar cache manualmente

### 📋 A fazer — Sprint 7 (Deploy)
- [ ] Deploy via Vercel ou Firebase Hosting
- [ ] URL pública funcional
- [ ] Monitoramento de cota do Firebase (alertas quando próximo do limite)

### 🚫 Bloqueado — Sprint 8 (Mobile)
- [ ] Configurar AVD + Expo Orbit
- [ ] Adaptar web para React Native
- [ ] Gerar APK

### 🚫 Bloqueado — Sprint 9 (Repositório Final)
- [ ] Licença All Rights Reserved
- [ ] README final completo
- [ ] Badges de status

### 🔮 Futuro — Sprint 10 (Escalabilidade)
- [ ] Cache backend (Firebase Functions ou Cloudflare Workers) — só se cota do Firebase começar a ficar apertada
- [ ] Endpoint intermediário servindo dataset cacheado (~1 read/hora no Firebase independente do nº de usuários)
- [ ] Métricas de uso: reads/dia, usuários ativos, tempo médio de resposta
- [ ] Considerar migração para Firestore se Realtime DB limitar

## REGRAS DO PROJETO

1. **Nunca commitar** `secrets/`, `.env`, `*adminsdk*.json`
2. **Commits semânticos** obrigatórios
3. **Branching:** `main` → `developer` → `feature/nome-da-feature`
4. **Firebase:** estrutura de dados usa ID determinístico MD5 como chave
5. **Licença:** All Rights Reserved — uso comercial proibido sem autorização do autor
6. **Repositório público** — portfólio técnico de Maicon Vitor



idéias  só para não perder por agora.



Sobre o padrão hover + dropdown pra Termos/Como usar/Como funciona:
Funciona muito bem na home, mas tem algumas considerações:

No mobile não tem hover — em React Native e mobile web, hover não existe. Vira tap/touch. Então planeja desde já que no mobile isso vira um click que abre um modal ou navega pra uma tela dedicada. Se você quer "uma única implementação" pra web + mobile, melhor ir de click-to-open direto (vira consistent entre plataformas).
Para Termos de Uso e Política de Privacidade especificamente — esses não devem ficar só num dropdown de hover. Razões:

LGPD exige que o usuário consiga acessar a qualquer momento, de forma clara
Play Store / App Store exigem URL pública (tipo myorbita.com.br/privacidade) pra aprovar o app
Se mudar algo crítico, você precisa notificar usuários — hover dropdown não serve pra isso
O padrão universal é link fixo no footer ("Termos" | "Privacidade" | "Sobre") — usuários esperam isso

Pode ter no header via hover + dropdown também, mas tenha no footer obrigatoriamente.
"Como usar" e "Como funciona" — esses sim cabem perfeitamente no dropdown de hover. São informacionais, não-jurídicos, e não precisam de URL pública dedicada. Alternativa ainda melhor: página de onboarding na primeira abertura + tooltip sutil no header depois.


Resumo prático:
ItemOndeComo funcionaHover + dropdown ✅ (ou onboarding)Como usarHover + dropdown ✅ (ou FAQ)Termos de usoFooter fixo + página dedicada ⚠️Política de privacidadeFooter fixo + página dedicada ⚠️Sobre / créditosFooter fixo ou hover, tanto faz

Anota isso pra quando for implementar a home. Agora, bora voltar — já terminou a criação do projeto Firebase?


