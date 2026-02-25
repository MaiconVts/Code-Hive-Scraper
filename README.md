# Code Hive — Motor de Busca (Backend/Scraper)

Motor de busca autônomo projetado para o ecossistema Code Hive. Este serviço atua como um *background worker*, responsável por extrair, padronizar e armazenar vagas de múltiplas categorias profissionais em um banco de dados em nuvem (Firebase Realtime Database), consumido pelo aplicativo mobile.

## Índice
1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Padrões de Projeto](#2-padrões-de-projeto)
3. [Algoritmos e Estruturas de Dados](#3-algoritmos-e-estruturas-de-dados)
4. [Resiliência de Rede e Evasão](#4-resiliência-de-rede-e-evasão)
5. [Infraestrutura e Segurança](#5-infraestrutura-e-segurança)
6. [Pré-requisitos e Instalação](#6-pré-requisitos-e-instalação)
7. [Como Executar](#7-como-executar)
8. [Estrutura do Projeto](#8-estrutura-do-projeto)

---

## 1. Visão Geral da Arquitetura

O sistema foi arquitetado sob o conceito de **Desacoplamento de Jobs em Background**. O script Python opera de forma independente do front-end, consolidando um alto volume de dados de múltiplas categorias profissionais e enviando-os ao Firebase Realtime Database via SDK Admin.

O fluxo completo é:

```
Agendador (cron job) → main.py → Scrapers → Firebase Realtime DB → App Mobile
```

O script itera sobre um dicionário de categorias (`CATEGORIAS`), processando cada uma de forma independente: lê seu arquivo de queries, executa as buscas, salva um backup local e faz o upload para a rota correspondente no Firebase.

### Categorias Implementadas

| Categoria | Arquivo de Queries | DB Local | Rota Firebase |
|---|---|---|---|
| Tecnologia | `queries.json` | `db_dev.json` | `/vagas-dev` |
| Direito | `queries_advogados.json` | `db_adv.json` | `/vagas-adv` |

---

## 2. Padrões de Projeto

### 2.1. Template Method (Classe Abstrata)
Para garantir a padronização absoluta dos dados enviados ao front-end, o sistema utiliza o padrão *Template Method* através da biblioteca nativa `abc` (Abstract Base Classes).
- **Implementação:** A classe `BaseScraper` define o contrato rigoroso do algoritmo.
- **Intenção:** Qualquer novo scraper é forçado a herdar esta classe e implementar o método `buscar_vagas`. O método `padronizar_vaga` garante que o dicionário de saída contenha sempre chaves idênticas (`id`, `titulo`, `empresa`, `modalidade`, `link`, `data_publicacao`, `origem`), prevenindo quebras no mapeamento da interface do usuário.

### 2.2. Strategy Pattern (Roteamento Dinâmico de Scrapers)
O núcleo do sistema (`main.py`) é isento de lógicas condicionais complexas para seleção de plataforma.
- **Implementação:** O dicionário `SCRAPERS_DISPONIVEIS` mapeia o nome da plataforma diretamente para o objeto de sua classe.
- **Intenção:** Respeitar o Princípio Aberto/Fechado (OCP). Novas plataformas de busca podem ser adicionadas com uma única linha no dicionário, sem alterar nenhuma outra função.

### 2.3. Strategy Pattern (Roteamento Dinâmico de Categorias)
O mesmo princípio é aplicado às categorias profissionais através do dicionário `CATEGORIAS`.
- **Implementação:** Cada entrada do dicionário carrega o trio `{queries, db, rota}`, tornando cada categoria completamente autossuficiente.
- **Intenção:** Adicionar uma nova categoria (ex: `"saude"`) exige apenas uma nova linha no dicionário — o loop de orquestração não precisa ser tocado.

---

## 3. Algoritmos e Estruturas de Dados

### 3.1. Deduplicação em Tempo Constante O(1)
Devido à sobreposição inevitável de palavras-chave nas buscas, a mesma vaga pode ser retornada múltiplas vezes.
- **Estrutura:** Conjunto (`set`), fundamentado em Tabelas Hash.
- **Mecanismo:** Antes da inserção, o algoritmo verifica a existência do hash único da vaga (URL). A complexidade O(1) desta operação é superior a varreduras em listas O(N), economizando ciclos de CPU em grandes volumes.

### 3.2. Escrita Atômica (Atomic Write)
O salvamento local do banco de dados é tratado como operação crítica para evitar corrupção em caso de interrupções.
- **Mecanismo:** Os dados são persistidos em um arquivo temporário (`db_temp.json`). Após o sucesso do I/O, o sistema operacional executa a substituição do arquivo original de forma instantânea e indivisível (`os.replace`), garantindo que o arquivo nunca fique em estado corrompido.

### 3.3. Hashing Determinístico de IDs
Cada vaga recebe um ID único gerado a partir da URL, garantindo idempotência entre execuções.
- **Mecanismo:** `hashlib.md5(url)` gera sempre o mesmo ID para a mesma vaga, independente de quantas vezes o scraper for executado.

---

## 4. Resiliência de Rede e Evasão

Para mitigar bloqueios aplicados por Web Application Firewalls (WAF) em operações de scraping em lote, o módulo base implementa algoritmos de resiliência e disfarce:

- **Exponential Backoff:** Em respostas de bloqueio temporário (HTTP 429), o sistema aplica recuo exponencial no tempo de espera antes da próxima tentativa (2s, 4s, 8s), reduzindo a agressividade sobre a infraestrutura alvo.
- **Jitter Uniforme:** Inserção de ruído matemático aleatório (`random.uniform`) nos intervalos de requisição, diluindo assinaturas temporais determinísticas e simulando o comportamento humano de leitura e clique.
- **User-Agent Fixo de Navegador Real:** Todas as requisições utilizam um User-Agent de navegador moderno para evitar bloqueios primários por identificação de bot.
- **Agendamento Aleatório:** O cron job é configurado em horário não-redondo (ex: 03:24) para evitar detecção por padrão temporal fixo.

---

## 5. Infraestrutura e Segurança

### Firebase Realtime Database
O Firebase atua como camada de persistência em nuvem. O scraper utiliza o SDK Admin do Firebase para autenticação com privilégios elevados, independente das regras de segurança do banco.

### Gerenciamento de Credenciais
As credenciais sensíveis nunca são hardcoded no código-fonte:
- A chave de serviço do Firebase (`*.json`) fica armazenada localmente em `secrets/`, ignorada pelo `.gitignore`.
- As variáveis de ambiente são carregadas via `.env` com a biblioteca `python-dotenv`.

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

## 6. Pré-requisitos e Instalação

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

## 7. Como Executar

### Execução manual
```bash
python main.py
```

O script processa todas as categorias em sequência, exibindo progresso em tempo real.

### Execução automatizada (recomendado)
Configure um agendador para rodar o script uma vez por dia em horário aleatório não-redondo. No Windows, use o **Task Scheduler**. Em Linux/Mac, use **cron**:

```bash
# Exemplo: roda todo dia às 03:24
24 3 * * * /usr/bin/python3 /caminho/para/main.py
```

---

## 8. Estrutura do Projeto

```
Code-Hive-Scraper/
├── code-hive-app/          # Aplicativo mobile React Native (Expo)
├── scrapers/
│   ├── __init__.py
│   ├── base_scraper.py     # Contrato abstrato (Template Method)
│   └── gupy_scraper.py     # Implementação Gupy
├── secrets/
│   └── *.json              # Chave Firebase (não versionada)
├── .env                    # Variáveis de ambiente (não versionado)
├── .gitignore
├── db_dev.json             # Backup local — vagas de tecnologia
├── db_adv.json             # Backup local — vagas de direito
├── main.py                 # Orquestrador principal
├── queries.json            # Palavras-chave — tecnologia
├── queries_advogados.json  # Palavras-chave — direito
└── README.md
```