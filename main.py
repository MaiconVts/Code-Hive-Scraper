import json
import time
import os
import logging
from dotenv import load_dotenv
from scrapers.gupy_scraper import GupyScraper
import firebase_admin
from firebase_admin import credentials, db

load_dotenv()

# ============================================================
# CONFIGURAÇÃO DE LOGGING
# Substitui todos os print() por logging estruturado.
# - Terminal: mesmo output visual de antes
# - Arquivo: grava log completo para debug no GitHub Actions
# ============================================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S',
    handlers=[
        logging.StreamHandler(),                          # Output no terminal
        logging.FileHandler('scraper.log', mode='w'),     # Arquivo de log (sobrescreve a cada execução)
    ]
)
logger = logging.getLogger(__name__)

# Tabela Hash O(1) para rotear os scrapers (Padrão Strategy)
# Para criar um scraper novo, basta adicionar a chave e o valor correspondente aqui.
SCRAPERS_DISPONIVEIS = {
    "gupy": GupyScraper()
    # Exemplos de possíveis acréscimos futuros:
    # "linkedin": LinkedinScraper(),
}

# Arquivo temporário para evitar corrupção de dados durante a escrita (Atomic Write)
ARQUIVO_DB_TEMP = "db_temp.json"

CATEGORIAS = {
    "dev": {"queries": "queries_tecnologia.json", "db": "db_dev.json", "rota": "/vagas-dev"},
    "adv": {"queries": "queries_advogados.json",  "db": "db_adv.json", "rota": "/vagas-adv"},
}

FIREBASE_KEY_PATH = os.getenv("FIREBASE_KEY_PATH")
FIREBASE_DB_URL = os.getenv("FIREBASE_DB_URL")


def carregar_configuracoes(arquivo_queries: str):
    """Recebe o caminho do arquivo de queries como parâmetro. Cada categoria tem o seu."""
    try:
        with open(arquivo_queries, 'r', encoding='utf-8') as arquivo:
            return json.load(arquivo)
    except FileNotFoundError:
        logger.error(f"O arquivo '{arquivo_queries}' não foi encontrado.")
        return None


def inicializar_firebase():
    """
    Inicializa a conexão com o Firebase usando as credenciais do .env.
    Equivalente ao 'new FirebaseApp()' em outros SDKs.
    Verifica se já foi inicializado para evitar erro em múltiplas chamadas.
    """
    if not firebase_admin._apps:
        cred = credentials.Certificate(FIREBASE_KEY_PATH)
        firebase_admin.initialize_app(cred, {
            'databaseURL': FIREBASE_DB_URL
        })
        logger.info("Conexão com Firebase inicializada com sucesso!")


def carregar_ids_firebase(rota: str) -> set:
    """
    Carrega os IDs das vagas já salvas no Firebase ANTES do scraping.
    Retorna um set para lookup O(1) durante a deduplicação.
    Isso evita reprocessar vagas que já existem no banco.
    """
    try:
        ref = db.reference(rota)
        snapshot = ref.get()
        if snapshot and isinstance(snapshot, dict):
            ids = set(snapshot.keys())
            logger.info(f"Cache Firebase: {len(ids)} vagas já existentes em '{rota}'")
            return ids
        return set()
    except Exception as e:
        logger.warning(f"Falha ao carregar cache do Firebase '{rota}': {e}")
        return set()


def enviar_para_firebase(lista_vagas: list, rota: str):
    """
    Faz upload da lista de vagas para o Firebase Realtime Database.
    rota: '/vagas-dev' ou '/vagas-adv'
    O método set() substitui todos os dados na rota — comportamento intencional,
    pois queremos sempre a versão mais atualizada, sem acumular lixo.
    """
    try:
        ref = db.reference(rota)
        vagas_dict = {vaga['id']: vaga for vaga in lista_vagas}
        ref.set(vagas_dict)
        logger.info(f"[FIREBASE]: {len(lista_vagas)} vagas enviadas para '{rota}' com sucesso.")
    except Exception as e:
        logger.error(f"[FIREBASE ERRO]: Falha ao enviar dados. Erro: {str(e)}")


def salvar_dados_atomico(lista_vagas: list, arquivo_db: str):
    """
    Salva a lista de vagas com segurança (Escrita Atômica).
    O(1) para a substituição do arquivo no nível do SO.
    """
    estrutura_json = {
        "vagas": lista_vagas
    }

    try:
        with open(ARQUIVO_DB_TEMP, 'w', encoding='utf-8') as arquivo:
            json.dump(estrutura_json, arquivo, ensure_ascii=False, indent=4)
        os.replace(ARQUIVO_DB_TEMP, arquivo_db)
        logger.info(f"{len(lista_vagas)} vagas salvas de forma segura em '{arquivo_db}'!")
    except Exception as e:
        logger.error(f"Falha ao salvar os dados. O arquivo original não foi corrompido. Erro: {str(e)}")


def iniciar_scraping():
    """Itera sobre CATEGORIAS — roda dev e adv em sequência.
    Cada iteração é independente: queries, db local e rota Firebase próprios."""
    exibir_cabecalho()
    inicializar_firebase()
    inicio_total = time.time()

    for nome_categoria, categoria in CATEGORIAS.items():
        logger.info(f"\n{'=' * 60}")
        logger.info(f"CATEGORIA: {nome_categoria.upper()}")
        logger.info(f"{'=' * 60}")

        config = carregar_configuracoes(categoria['queries'])
        if not config:
            continue

        parametros = extrair_parametros(config)
        exibir_info_configuracoes(parametros)

        # Carrega IDs existentes no Firebase para evitar reprocessamento
        ids_firebase = carregar_ids_firebase(categoria['rota'])

        resultados = executar_buscas(parametros, ids_firebase)
        finalizar_scraping(resultados, categoria)

    # --- Métricas globais ---
    duracao_total = time.time() - inicio_total
    logger.info(f"\n{'=' * 60}")
    logger.info(f"EXECUÇÃO COMPLETA")
    logger.info(f"  Duração total: {duracao_total / 60:.1f} minutos ({duracao_total:.0f}s)")
    logger.info(f"{'=' * 60}")


def exibir_cabecalho():
    """Exibe o cabeçalho inicial do scraper."""
    logger.info("=" * 60)
    logger.info("INICIANDO AS BUSCAS DE VAGAS PARA O CODE HIVE!")
    logger.info("=" * 60)


def extrair_parametros(config: dict) -> dict:
    """Extrai e organiza os parâmetros de configuração."""
    return {
        'palavras_chave': config['filtros_de_busca']['palavras_chave'],
        'modalidades': config['filtros_de_busca']['modalidades'],
        'plataformas': config['configuracoes_gerais']['plataformas_alvo'],
        'limite_busca': config['configuracoes_gerais']['limite_vagas_por_pesquisa']
    }


def exibir_info_configuracoes(parametros: dict):
    """Exibe informações sobre as configurações carregadas."""
    total_combinacoes = len(parametros['palavras_chave']) * len(parametros['modalidades'])
    logger.info(f"Configurações: {len(parametros['palavras_chave'])} palavras-chave × "
                f"{len(parametros['modalidades'])} modalidades = {total_combinacoes} combinações")
    logger.info(f"Limite por busca: {parametros['limite_busca']} vagas (com paginação automática)")
    logger.info(f"Plataformas alvo: {', '.join(parametros['plataformas']).upper()}")
    logger.info("-" * 60)


def executar_buscas(parametros: dict, ids_firebase: set) -> dict:
    """Executa o loop principal de buscas."""
    urls_vistas = set()
    todas_as_vagas = []
    total_combinacoes = 0
    total_duplicadas = 0
    total_ja_no_firebase = 0
    inicio = time.time()

    for plataforma in parametros['plataformas']:
        scraper = obter_scraper(plataforma)
        if not scraper:
            continue

        for palavra in parametros['palavras_chave']:
            for modalidade in parametros['modalidades']:
                total_combinacoes += 1

                logger.info(f"Buscando '{palavra}' — '{modalidade}' — '{plataforma}'...")

                vagas_encontradas = scraper.buscar_vagas(palavra, modalidade, parametros['limite_busca'])

                vagas_novas, duplicadas, ja_firebase = filtrar_duplicadas(
                    vagas_encontradas, urls_vistas, ids_firebase
                )
                total_duplicadas += duplicadas
                total_ja_no_firebase += ja_firebase

                if vagas_novas:
                    logger.info(f"  ✅ {len(vagas_novas)} vagas únicas adicionadas.")
                    todas_as_vagas.extend(vagas_novas)
                elif duplicadas > 0 or ja_firebase > 0:
                    logger.info(f"  ⏭️ {duplicadas} duplicadas, {ja_firebase} já no Firebase.")
                else:
                    logger.info(f"  ⚠️ Nenhuma vaga encontrada.")

    duracao = time.time() - inicio

    return {
        'vagas': todas_as_vagas,
        'total_combinacoes': total_combinacoes,
        'total_duplicadas': total_duplicadas,
        'total_ja_no_firebase': total_ja_no_firebase,
        'duracao_segundos': duracao,
    }


def obter_scraper(plataforma: str):
    """Obtém a instância do scraper para a plataforma especificada."""
    nome_plataforma = plataforma.lower()

    if nome_plataforma not in SCRAPERS_DISPONIVEIS:
        logger.warning(f"Plataforma '{plataforma}' não implementada. Pulando...")
        return None

    return SCRAPERS_DISPONIVEIS[nome_plataforma]


def filtrar_duplicadas(vagas: list, urls_vistas: set, ids_firebase: set) -> tuple:
    """
    Filtra vagas duplicadas usando Set. Agora com 3 níveis:
    1. URL já vista nesta execução (duplicata intra-scraping)
    2. ID já existe no Firebase (duplicata cross-execução)
    3. Vaga nova — adiciona

    Retorna (vagas_unicas, count_duplicadas, count_ja_firebase)
    """
    vagas_unicas = []
    duplicadas = 0
    ja_firebase = 0

    for vaga in vagas:
        # Nível 1: duplicata desta execução
        if vaga['link'] in urls_vistas:
            duplicadas += 1
            continue

        urls_vistas.add(vaga['link'])

        # Nível 2: já existe no Firebase
        if vaga['id'] in ids_firebase:
            ja_firebase += 1
            # Ainda adiciona — queremos manter no set final pra o ref.set()
            # substituir tudo com dados atualizados
            vagas_unicas.append(vaga)
            continue

        # Nível 3: vaga genuinamente nova
        vagas_unicas.append(vaga)

    return vagas_unicas, duplicadas, ja_firebase


def finalizar_scraping(resultados: dict, categoria: dict):
    """Finaliza o processo exibindo estatísticas e salvando dados."""
    duracao = resultados['duracao_segundos']
    total_vagas = len(resultados['vagas'])

    logger.info("-" * 60)
    logger.info(f"Orquestração finalizada!")
    logger.info(f"  • Combinações pesquisadas: {resultados['total_combinacoes']}")
    logger.info(f"  • Vagas únicas coletadas: {total_vagas}")
    logger.info(f"  • Duplicadas ignoradas (intra-scraping): {resultados['total_duplicadas']}")
    logger.info(f"  • Já existentes no Firebase: {resultados['total_ja_no_firebase']}")
    logger.info(f"  • Duração: {duracao / 60:.1f} minutos ({duracao:.0f}s)")

    if total_vagas > 0:
        vagas_por_segundo = total_vagas / duracao if duracao > 0 else 0
        taxa_duplicata = resultados['total_duplicadas'] / (total_vagas + resultados['total_duplicadas']) * 100
        logger.info(f"  • Performance: {vagas_por_segundo:.1f} vagas/segundo")
        logger.info(f"  • Taxa de duplicatas: {taxa_duplicata:.1f}%")

        salvar_dados_atomico(resultados['vagas'], categoria['db'])
        enviar_para_firebase(resultados['vagas'], categoria['rota'])
    else:
        logger.warning("Nenhuma vaga nova encontrada. JSON não atualizado.")

    logger.info("=" * 60)


if __name__ == "__main__":
    iniciar_scraping()