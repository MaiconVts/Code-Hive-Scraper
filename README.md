# Code Hive — Agregador Inteligente de Vagas

> Projeto full stack multiplataforma de uso pessoal e portfólio. Todos os direitos reservados. Uso comercial proibido sem autorização expressa do autor.

---

## Índice
1. [Escopo e Visão do Produto](#1-escopo-e-visão-do-produto)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Visão Geral da Arquitetura](#3-visão-geral-da-arquitetura)
4. [Padrões de Projeto](#4-padrões-de-projeto)
5. [Algoritmos e Estruturas de Dados](#5-algoritmos-e-estruturas-de-dados)
6. [Resiliência de Rede e Evasão](#6-resiliência-de-rede-e-evasão)
7. [Infraestrutura e Segurança](#7-infraestrutura-e-segurança)
8. [Pré-requisitos e Instalação](#8-pré-requisitos-e-instalação)
9. [Como Executar](#9-como-executar)
10. [Estrutura do Projeto](#10-estrutura-do-projeto)

---

## 1. Escopo e Visão do Produto

O **Code Hive** é um agregador inteligente de vagas profissionais, desenvolvido como projeto solo de uso pessoal e portfólio técnico.

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
| Mobile | React Native + Expo | Compartilhamento de lógica com web |
| Deploy Web | Vercel / Firebase Hosting | Gratuito, zero configuração |

---

## 3. Visão Geral da Arquitetura

O sistema foi arquitetado sob o conceito de **Desacoplamento de Jobs em Background**. O script Python opera de forma independente do front-end, consolidando um alto volume de dados de múltiplas categorias profissionais e enviando-os ao Firebase Realtime Database via SDK Admin.

O fluxo completo é:

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

O script itera sobre um dicionário de categorias (`CATEGORIAS`), processando cada uma de forma independente: lê seu arquivo de queries, executa as buscas, salva um backup local e faz o upload para a rota correspondente no Firebase.

---

## 4. Padrões de Projeto

### 4.1. Template Method (Classe Abstrata)
Para garantir a padronização absoluta dos dados enviados ao front-end, o sistema utiliza o padrão *Template Method* através da biblioteca nativa `abc` (Abstract Base Classes).
- **Implementação:** A classe `BaseScraper` define o contrato rigoroso do algoritmo.
- **Intenção:** Qualquer novo scraper é forçado a herdar esta classe e implementar o método `buscar_vagas`. O método `padronizar_vaga` garante que o dicionário de saída contenha sempre chaves idênticas (`id`, `titulo`, `empresa`, `modalidade`, `link`, `data_publicacao`, `origem`), prevenindo quebras no mapeamento da interface do usuário.

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

### 5.1. Deduplicação em Tempo Constante O(1)
Devido à sobreposição inevitável de palavras-chave nas buscas, a mesma vaga pode ser retornada múltiplas vezes.
- **Estrutura:** Conjunto (`set`), fundamentado em Tabelas Hash.
- **Mecanismo:** Antes da inserção, o algoritmo verifica a existência do hash único da vaga (URL). A complexidade O(1) desta operação é superior a varreduras em listas O(N), economizando ciclos de CPU em grandes volumes.

### 5.2. Escrita Atômica (Atomic Write)
O salvamento local do banco de dados é tratado como operação crítica para evitar corrupção em caso de interrupções.
- **Mecanismo:** Os dados são persistidos em um arquivo temporário (`db_temp.json`). Após o sucesso do I/O, o sistema operacional executa a substituição do arquivo original de forma instantânea e indivisível (`os.replace`), garantindo que o arquivo nunca fique em estado corrompido.

### 5.3. Hashing Determinístico de IDs
Cada vaga recebe um ID único gerado a partir da URL, garantindo idempotência entre execuções.
- **Mecanismo:** `hashlib.md5(url)` gera sempre o mesmo ID para a mesma vaga, independente de quantas vezes o scraper for executado.

---

## 6. Resiliência de Rede e Evasão

Para mitigar bloqueios aplicados por Web Application Firewalls (WAF) em operações de scraping em lote, o módulo base implementa algoritmos de resiliência e disfarce:

- **Exponential Backoff:** Em respostas de bloqueio temporário (HTTP 429), o sistema aplica recuo exponencial no tempo de espera antes da próxima tentativa (2s, 4s, 8s).
- **Jitter Uniforme:** Inserção de ruído matemático aleatório (`random.uniform`) nos intervalos de requisição, simulando comportamento humano.
- **User-Agent de Navegador Real:** Todas as requisições utilizam um User-Agent moderno para evitar bloqueios primários por identificação de bot.
- **Agendamento Aleatório:** O cron job é configurado em horário não-redondo (03:24) para evitar detecção por padrão temporal fixo.

---

## 7. Infraestrutura e Segurança

### Firebase Realtime Database
O Firebase atua como camada de persistência em nuvem. O scraper utiliza o SDK Admin para autenticação com privilégios elevados, independente das regras de segurança do banco.

### Gerenciamento de Credenciais
As credenciais sensíveis nunca são hardcoded no código-fonte:
- A chave de serviço do Firebase fica armazenada localmente em `secrets/`, ignorada pelo `.gitignore`.
- As variáveis de ambiente são carregadas via `.env` com a biblioteca `python-dotenv`.
- Em produção (GitHub Actions), as credenciais são injetadas via **GitHub Secrets**.

```env
FIREBASE_KEY_PATH=secrets/sua-chave-firebase.json
FIREBASE_DB_URL=https://seu-projeto-default-rtdb.firebaseio.com
```

### Arquivos protegidos pelo `.gitignore`
```
secrets/
*adminsdk*.json
.env
```

---

## 8. Pré-requisitos e Instalação

- **Python 3.8+**
- Gerenciador de pacotes `pip`

Clone o repositório e instale as dependências:

```bash
pip install requests firebase-admin python-dotenv
```

Configure o ambiente:
1. Crie a pasta `secrets/` na raiz do projeto
2. Coloque a chave de serviço do Firebase dentro de `secrets/`
3. Crie o arquivo `.env` na raiz com as variáveis acima

---

## 9. Como Executar

### Execução manual
```bash
python main.py
```

O script processa todas as categorias em sequência, exibindo progresso em tempo real.

### Execução automatizada
O GitHub Actions executa o script automaticamente todo dia às 03:24 (horário de Brasília). Nenhuma ação manual é necessária após o setup inicial.

---

## 10. Estrutura do Projeto

```
Code-Hive-Scraper/
├── .github/
│   └── workflows/
│       └── scraper.yml         # Automação GitHub Actions
├── code-hive-web/              # Aplicação web React + Vite (em desenvolvimento)
├── code-hive-app/              # Aplicativo mobile React Native + Expo (planejado)
├── scrapers/
│   ├── __init__.py
│   ├── base_scraper.py         # Contrato abstrato (Template Method)
│   └── gupy_scraper.py         # Implementação Gupy
├── secrets/
│   └── *.json                  # Chave Firebase (não versionada)
├── .env                        # Variáveis de ambiente (não versionado)
├── .gitignore
├── db_dev.json                 # Backup local — vagas de tecnologia
├── db_adv.json                 # Backup local — vagas de direito
├── main.py                     # Orquestrador principal
├── queries_tecnologia.json     # Palavras-chave — tecnologia
├── queries_advogados.json      # Palavras-chave — direito
└── README.md
```

---

*Code Hive © 2026 — Todos os direitos reservados. Uso comercial proibido sem autorização expressa do autor.*