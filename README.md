# Code Hive - Motor de Busca (Backend/Scraper)

Motor de busca autônomo projetado para o ecossistema Code Hive. Este serviço atua como um *background worker*, responsável por extrair, padronizar e armazenar vagas de tecnologia de múltiplas plataformas em um banco de dados estático (`db.json`), que posteriormente é consumido de forma paginada pelo aplicativo front-end.

## Índice
1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Padrões de Projeto](#2-padrões-de-projeto)
3. [Algoritmos e Estruturas de Dados](#3-algoritmos-e-estruturas-de-dados)
4. [Resiliência de Rede e Evasão](#4-resiliência-de-rede-e-evasão)
5. [Pré-requisitos e Instalação](#5-pré-requisitos-e-instalação)
6. [Como Executar](#6-como-executar)

---

## 1. Visão Geral da Arquitetura

O sistema foi arquitetado sob o conceito de **Desacoplamento de Jobs em Background**. O script Python opera de forma independente do front-end, consolidando um alto volume de dados em um JSON estruturado. Essa abordagem isola a latência de rede e o tempo de processamento das requisições web, garantindo que o aplicativo móvel consulte o banco de dados via JSON Server com tempo de resposta quase instantâneo.

## 2. Padrões de Projeto

### 2.1. Template Method (Classe Abstrata)
Para garantir a padronização absoluta dos dados enviados ao front-end, o sistema utiliza o padrão *Template Method* através da biblioteca nativa `abc` (Abstract Base Classes).
* **Implementação:** A classe `BaseScraper` define o contrato rigoroso do algoritmo.
* **Intenção:** Qualquer novo scraper instanciado no sistema é forçado a herdar esta classe e implementar o método `buscar_vagas`. O método `padronizar_vaga` garante que o dicionário de saída contenha sempre chaves idênticas (`id`, `titulo`, `empresa`, `modalidade`, `link`, `data_publicacao`, `origem`), prevenindo quebras no mapeamento da interface do usuário.

### 2.2. Strategy Pattern (Roteamento Dinâmico)
O núcleo do sistema (`main.py`) é isento de lógicas condicionais complexas para a seleção de rotas.
* **Implementação:** Utiliza-se um dicionário (`SCRAPERS_DISPONIVEIS`) para mapear o nome da plataforma diretamente para o objeto de sua classe respectiva.
* **Intenção:** Permitir a escalabilidade horizontal respeitando o Princípio Aberto/Fechado (Open/Closed Principle). Novas fontes de dados podem ser plugadas adicionando apenas uma linha ao dicionário de estratégias.

## 3. Algoritmos e Estruturas de Dados

### 3.1. Deduplicação em Tempo Constante O(1)
Devido à sobreposição inevitável de palavras-chave nas buscas, a mesma vaga pode ser retornada múltiplas vezes.
* **Estrutura:** Conjunto (`set` em Python), fundamentado em Tabelas Hash.
* **Mecanismo:** Antes da inserção, o algoritmo verifica a existência do Hash único da vaga (URL). A complexidade O(1) desta operação torna a filtragem superior a varreduras em listas O(N), economizando ciclos de CPU em grandes volumes.

### 3.2. Escrita Atômica (Atomic Write)
O salvamento do banco de dados `db.json` é tratado como uma operação crítica para evitar corrupção de dados em caso de interrupções de hardware ou software.
* **Mecanismo:** Os dados são inicialmente persistidos em um arquivo temporário (`db_temp.json`). Após o sucesso da operação de I/O, o sistema operacional executa a substituição do arquivo original pelo novo de forma instantânea e indivisível (`os.replace`).

## 4. Resiliência de Rede e Evasão

Para mitigar bloqueios aplicados por Web Application Firewalls (WAF) em operações de scraping em lote, o módulo base implementa algoritmos de resiliência e disfarce:

* **Connection Pooling:** O uso de `requests.Session()` mantém o canal TCP ativo entre as requisições, reduzindo a sobrecarga de handshakes TLS e o alerta de tráfego anômalo.
* **Exponential Backoff:** Em respostas de bloqueio temporário (HTTP 429 - Too Many Requests), o sistema aplica um recuo exponencial no tempo de espera antes da próxima tentativa, reduzindo a agressividade na infraestrutura alvo.
* **Jitter Uniforme:** Inserção de ruído matemático aleatório (`random.uniform`) nos intervalos de requisição, diluindo assinaturas temporais determinísticas e simulando o tempo de leitura e clique de um navegador humano.

---

## 5. Pré-requisitos e Instalação

* **Python 3.8+** instalado no ambiente.
* Gerenciador de pacotes `pip`.

Clone o repositório e instale a dependência de rede:
```bash
# Instalação da biblioteca requests para comunicação HTTP
pip install requests
