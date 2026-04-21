"""
scraper_runner.py — Orquestração compartilhada entre todas as plataformas.

Responsabilidade Única: coordenar o fluxo de execução de um scraper qualquer.
- Configura logging UTF-8 (Windows + Linux)
- Inicializa Firebase
- Carrega queries da categoria (dev/adv)
- Executa buscas com deduplicação 3 níveis
- Envia resultados para o Firebase incrementalmente (por keyword)
- Imprime métricas

Cada main (main_gupy, main_linkedin) importa daqui e só precisa:
1. Instanciar seu scraper
2. Definir o nome da plataforma
3. Chamar executar()

Toda a plumbing fica aqui, DRY ao máximo.
"""
import json
import logging
import os
import sys
import time
from typing import Protocol

import firebase_admin
from dotenv import load_dotenv
from firebase_admin import credentials, db

load_dotenv()

# ============================================================
# LOGGING — UTF-8 forçado para Windows + Linux
# ============================================================
_logging_configurado = False


def configurar_logging():
    """Configura logging uma única vez, mesmo se chamado múltiplas vezes."""
    global _logging_configurado
    if _logging_configurado:
        return

    logger = logging.getLogger()
    logger.setLevel(logging.INFO)

    formatter = logging.Formatter(
        fmt='%(asctime)s [%(levelname)s] %(message)s',
        datefmt='%H:%M:%S'
    )

    file_handler = logging.FileHandler('scraper.log', mode='w', encoding='utf-8')
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    stream_handler = logging.StreamHandler(
        open(sys.stdout.fileno(), mode='w', encoding='utf-8', closefd=False)
    )
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    _logging_configurado = True


logger = logging.getLogger(__name__)


# ============================================================
# PROTOCOLO DO SCRAPER — tipagem estrutural (Duck Typing formal)
# ============================================================
class ScraperProtocol(Protocol):
    """
    Qualquer objeto que tenha o método buscar_vagas com essa assinatura
    pode ser usado pelo runner. Não precisa herdar nada.
    """
    def buscar_vagas(self, palavra_chave: str, modalidade: str, limite: int) -> list: ...


# ============================================================
# CONFIGURAÇÃO FIREBASE
# ============================================================
FIREBASE_KEY_PATH = os.getenv("FIREBASE_KEY_PATH")
FIREBASE_DB_URL = os.getenv("FIREBASE_DB_URL")


def inicializar_firebase():
    """Inicializa Firebase uma única vez (idempotente)."""
    if not firebase_admin._apps:
        cred = credentials.Certificate(FIREBASE_KEY_PATH)
        firebase_admin.initialize_app(cred, {
            'databaseURL': FIREBASE_DB_URL
        })
        logger.info("Conexão com Firebase inicializada com sucesso!")


def carregar_ids_firebase(rota: str) -> set:
    """
    Carrega IDs de vagas já existentes no Firebase antes do scraping.
    Retorna set para lookup O(1) durante dedup.
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


def persistir_vagas_incrementalmente(vagas_novas: list, rota: str):
    """
    Persiste vagas no Firebase imediatamente após cada keyword.

    Usa ref.update() em vez de ref.set() — mescla os novos registros
    sem sobrescrever o que já foi salvo nas keywords anteriores.
    Isso garante que um timeout no meio da execução não perde
    o progresso já persistido.

    ref.set()    → substitui o nó inteiro (comportamento anterior — perigoso)
    ref.update() → mescla {id: vaga} no nó existente (idempotente, seguro)
    """
    try:
        ref = db.reference(rota)
        vagas_dict = {vaga['id']: vaga for vaga in vagas_novas}
        ref.update(vagas_dict)
        logger.info(f"  💾 {len(vagas_novas)} vagas persistidas em '{rota}'.")
    except Exception as e:
        logger.error(f"[FIREBASE ERRO]: Falha ao persistir vagas em '{rota}'. Erro: {str(e)}")


# ============================================================
# CONFIGURAÇÕES DE QUERIES
# ============================================================
def carregar_configuracoes(arquivo_queries: str):
    """Lê JSON de queries da categoria."""
    try:
        with open(arquivo_queries, 'r', encoding='utf-8') as arquivo:
            return json.load(arquivo)
    except FileNotFoundError:
        logger.error(f"O arquivo '{arquivo_queries}' não foi encontrado.")
        return None


def extrair_parametros(config: dict) -> dict:
    """Normaliza a estrutura do JSON de queries."""
    return {
        'palavras_chave': config['filtros_de_busca']['palavras_chave'],
        'modalidades': config['filtros_de_busca']['modalidades'],
        'limite_busca': config['configuracoes_gerais']['limite_vagas_por_pesquisa'],
    }


def exibir_info_configuracoes(parametros: dict, plataforma: str):
    """Log das configurações carregadas."""
    total_combinacoes = len(parametros['palavras_chave']) * len(parametros['modalidades'])
    logger.info(f"Configurações: {len(parametros['palavras_chave'])} palavras-chave × "
                f"{len(parametros['modalidades'])} modalidades = {total_combinacoes} combinações")
    logger.info(f"Limite por busca: {parametros['limite_busca']} vagas (com paginação automática)")
    logger.info(f"Plataforma alvo: {plataforma.upper()}")
    logger.info("-" * 60)


# ============================================================
# DEDUPLICAÇÃO 3 NÍVEIS
# ============================================================
def filtrar_duplicadas(vagas: list, urls_vistas: set, ids_firebase: set) -> tuple:
    """
    Deduplicação 3 níveis:
    1. URL já vista nesta execução (duplicata intra-scraping)
    2. ID já existe no Firebase (duplicata cross-execução — descarta,
       pois ref.update() não precisa re-enviar o que já está lá)
    3. Vaga genuinamente nova — adiciona
    """
    vagas_unicas = []
    duplicadas = 0
    ja_firebase = 0

    for vaga in vagas:
        if vaga['link'] in urls_vistas:
            duplicadas += 1
            continue
        urls_vistas.add(vaga['link'])

        if vaga['id'] in ids_firebase:
            ja_firebase += 1
            continue  # Com update() incremental, não precisa re-enviar existentes

        ids_firebase.add(vaga['id'])  # Registra localmente para dedup intra-execução
        vagas_unicas.append(vaga)

    return vagas_unicas, duplicadas, ja_firebase


# ============================================================
# LOOP PRINCIPAL DE BUSCAS
# ============================================================

    
    def executar_buscas(scraper: ScraperProtocol, parametros: dict, ids_firebase: set, rota: str) -> dict:
        """
    Loop de buscas: itera palavras × modalidades, aplica dedup,
    persiste no Firebase a cada keyword e retorna métricas.

    A persistência incremental (por keyword) garante que um timeout
    no GitHub Actions não perde o progresso já coletado — cada keyword
    concluída é imediatamente salva via ref.update().
    """
    urls_vistas = set()
    todas_as_vagas = []
    total_combinacoes = 0
    total_duplicadas = 0
    total_ja_no_firebase = 0
    inicio = time.time()
    keywords_desde_checkpoint = 0

    for palavra in parametros['palavras_chave']:
        for modalidade in parametros['modalidades']:
            total_combinacoes += 1

            logger.info(f"Buscando '{palavra}' — '{modalidade}'...")

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

        # Checkpoint a cada 10 keywords (loop externo — por palavra, não por combinação)
        keywords_desde_checkpoint += 1
        if keywords_desde_checkpoint >= 10:
            logger.info(f"  💾 Checkpoint: {len(todas_as_vagas)} vagas salvas até agora...")
            enviar_para_firebase(todas_as_vagas, rota)
            keywords_desde_checkpoint = 0

    duracao = time.time() - inicio

    return {
        'vagas': todas_as_vagas,
        'total_combinacoes': total_combinacoes,
        'total_duplicadas': total_duplicadas,
        'total_ja_no_firebase': total_ja_no_firebase,
        'duracao_segundos': duracao,
    }


# ============================================================
# FINALIZAÇÃO — apenas métricas (upload já foi feito incrementalmente)
# ============================================================
def finalizar_scraping(resultados: dict, rota: str):
    """
    Imprime métricas da categoria.
    O upload para o Firebase já ocorreu incrementalmente durante executar_buscas —
    esta função não faz mais nenhum ref.set() ou ref.update().
    """
    duracao = resultados['duracao_segundos']
    total_vagas = resultados['total_vagas_salvas']

    logger.info("-" * 60)
    logger.info(f"Orquestração finalizada!")
    logger.info(f"  • Combinações pesquisadas: {resultados['total_combinacoes']}")
    logger.info(f"  • Vagas únicas salvas no Firebase: {total_vagas}")
    logger.info(f"  • Duplicadas ignoradas (intra-scraping): {resultados['total_duplicadas']}")
    logger.info(f"  • Já existentes no Firebase (ignoradas): {resultados['total_ja_no_firebase']}")
    logger.info(f"  • Duração: {duracao / 60:.1f} minutos ({duracao:.0f}s)")

    if total_vagas > 0:
        vagas_por_segundo = total_vagas / duracao if duracao > 0 else 0
        logger.info(f"  • Performance: {vagas_por_segundo:.1f} vagas/segundo")
    else:
        logger.warning("Nenhuma vaga nova encontrada nesta categoria.")

    logger.info("=" * 60)


# ============================================================
# ENTRY POINT — chamado pelos mains específicos
# ============================================================
def executar(scraper: ScraperProtocol, plataforma: str, categorias: dict):
    """
    Executa o ciclo completo de scraping para todas as categorias.

    Args:
        scraper: instância do scraper (GupyScraper, LinkedinScraper, etc)
        plataforma: nome da plataforma (para logs)
        categorias: dict com as categorias a processar, formato:
            {
                "dev": {"queries": "queries/tecnologia_gupy.json", "rota": "/vagas/dev/gupy"},
                "adv": {"queries": "queries/advogados_gupy.json",  "rota": "/vagas/adv/gupy"},
            }
    """
    configurar_logging()

    logger.info("=" * 60)
    logger.info(f"INICIANDO MYORBITA SCRAPER — PLATAFORMA: {plataforma.upper()}")
    logger.info("=" * 60)

    inicializar_firebase()
    inicio_total = time.time()

    for nome_categoria, categoria in categorias.items():
        logger.info(f"\n{'=' * 60}")
        logger.info(f"CATEGORIA: {nome_categoria.upper()}")
        logger.info(f"{'=' * 60}")

        config = carregar_configuracoes(categoria['queries'])
        if not config:
            continue

        parametros = extrair_parametros(config)
        exibir_info_configuracoes(parametros, plataforma)

        ids_firebase = carregar_ids_firebase(categoria['rota'])

        # rota passada para executar_buscas — persistência incremental por keyword
        resultados = executar_buscas(scraper, parametros, ids_firebase, categoria['rota'])
        finalizar_scraping(resultados, categoria['rota'])

    duracao_total = time.time() - inicio_total
    logger.info(f"\n{'=' * 60}")
    logger.info(f"EXECUÇÃO COMPLETA — {plataforma.upper()}")
    logger.info(f"  Duração total: {duracao_total / 60:.1f} minutos ({duracao_total:.0f}s)")
    logger.info(f"{'=' * 60}")