import json
import time
import os # Para verificar se o arquivo de configuração existe antes de tentar ler
from scrapers.gupy_scraper import GupyScraper

# Tabela Hash O(1) para rotear os scrapers (Padrão Stragy)
# Senore qye criar um scraper novo, basta adicionar a chave e o valor correspondente aqui.
SCRAPERS_DISPONIVEIS = {
    "gupy": GupyScraper()
    # Exemplos de possiveis acrescimos futuros:
    # "Linkedin": LinkedinScraper(),
    # "Vagas.com": VagasComScraper(),
    # "Joinrs": JoinrsScraper(),
    # "Indeed": IndeedScraper(),
    # "Glassdoor": GlassdoorScraper(),
    # "InfoJobs": InfoJobsScraper(),
    # "Catho": CathoScraper(),
    # "Empregos.com": EmpregosComScraper(),
    # "Jooble": JoobleScraper(),
    # "TrabalhaBrasil": TrabalhaBrasilScraper(),
    # "Sine": SineScraper(),
}

# Nome do arquivo de banco de dados para o JSON SERVER
ARQUIVO_DB = "db.json"
ARQUIVO_DB_TEMP = "db_temp.json"  # Arquivo temporário para evitar corrupção de dados durante a escrita
ARQUIVO_CONFIG = "queries.json"

def carregar_configuracoes():
    """lê o arquivo de queries.json e retorna os dados."""
    try:
        with open(ARQUIVO_CONFIG, 'r', encoding='utf-8') as arquivo:
            return json.load(arquivo)
    except FileNotFoundError:
        print(f"[ERRO]: O arquivo '{ARQUIVO_CONFIG}' não foi encontrado.")
        return None
    
def salvar_dados_atomico(lista_vagas):
    """
    Salva a lista de vagas com segurança (Escrita Atômica).
    O(1) para a substituição do arquivo no nível do SO.
    """
    estrutura_json = {
        "vagas": lista_vagas
    }
    
    try:
        # 1 - Escreve os dados em um arquivo temporário
        with open(ARQUIVO_DB_TEMP, 'w', encoding='utf-8') as arquivo:
            json.dump(estrutura_json, arquivo, ensure_ascii=False, indent=4)
            
        # 2 - Substitui o arquivo original pelo temporário (Operação Atômica)
        os.replace(ARQUIVO_DB_TEMP, ARQUIVO_DB)
        
        
        print(f"[SUCESSO]: {len(lista_vagas)} vagas salvas de forma segura em '{ARQUIVO_DB}'!")
    except Exception as e:
        print(f"[ERRO CRÍTICO]: Falha ao salvar os dados. O arquivo original não foi corrompido. Erro: {str(e)}")
    
    
def iniciar_scraping():
    """Função principal que orquestra as buscas."""
    exibir_cabecalho()
    
    config = carregar_configuracoes()
    if not config:
        return
    
    parametros = extrair_parametros(config)
    exibir_info_configuracoes(parametros)
    
    resultados = executar_buscas(parametros)
    finalizar_scraping(resultados)


def exibir_cabecalho():
    """Exibe o cabeçalho inicial do scraper."""
    print("=" * 60)
    print("INICIANDO AS BUSCAS DE VAGAS PARA O CODE HIVE!")
    print("=" * 60)


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
    print(f"Configurações carregadas: {len(parametros['palavras_chave'])} palavras-chave, "
          f"{len(parametros['modalidades'])} modalidades, "
          f"limite de {parametros['limite_busca']} vagas.")
    print(f"Plataformas alvo: {', '.join(parametros['plataformas']).upper()}")
    print("-" * 60)


def executar_buscas(parametros: dict) -> dict:
    """Executa o loop principal de buscas."""
    urls_vistas = set()
    todas_as_vagas = []
    total_combinacoes = 0
    total_duplicadas = 0
    
    for plataforma in parametros['plataformas']:
        scraper = obter_scraper(plataforma)
        if not scraper:
            continue
        
        for palavra in parametros['palavras_chave']:
            for modalidade in parametros['modalidades']:
                total_combinacoes += 1
                
                print(f"[INFO]: Buscando '{palavra}' - '{modalidade}' - '{plataforma}'...")
                
                vagas_encontradas = scraper.buscar_vagas(palavra, modalidade, parametros['limite_busca'])
                
                vagas_novas, duplicadas = filtrar_duplicadas(vagas_encontradas, urls_vistas)
                total_duplicadas += duplicadas
                
                if vagas_novas:
                    print(f"[SUCESSO]: {len(vagas_novas)} vagas únicas adicionadas.")
                    todas_as_vagas.extend(vagas_novas)
                elif duplicadas > 0:
                    print(f"[AVISO]: {duplicadas} vagas duplicadas ignoradas.")
                else:
                    print(f"[AVISO]: Nenhuma vaga encontrada.")
    
    return {
        'vagas': todas_as_vagas,
        'total_combinacoes': total_combinacoes,
        'total_duplicadas': total_duplicadas
    }


def obter_scraper(plataforma: str):
    """Obtém a instância do scraper para a plataforma especificada."""
    nome_plataforma = plataforma.lower()
    
    if nome_plataforma not in SCRAPERS_DISPONIVEIS:
        print(f"[AVISO]: Plataforma '{plataforma}' não implementada. Pulando...")
        return None
    
    return SCRAPERS_DISPONIVEIS[nome_plataforma]


def filtrar_duplicadas(vagas: list, urls_vistas: set) -> tuple:
    """Filtra vagas duplicadas usando Set. Retorna (vagas_unicas, count_duplicadas)."""
    vagas_unicas = []
    duplicadas = 0
    
    for vaga in vagas:
        if vaga['link'] not in urls_vistas:
            urls_vistas.add(vaga['link'])
            vagas_unicas.append(vaga)
        else:
            duplicadas += 1
    
    return vagas_unicas, duplicadas


def finalizar_scraping(resultados: dict):
    """Finaliza o processo exibindo estatísticas e salvando dados."""
    print("-" * 60)
    print(f"Orquestração finalizada!")
    print(f"  • Combinações pesquisadas: {resultados['total_combinacoes']}")
    print(f"  • Vagas únicas encontradas: {len(resultados['vagas'])}")
    print(f"  • Vagas duplicadas ignoradas: {resultados['total_duplicadas']}")
    
    if resultados['vagas']:
        salvar_dados_atomico(resultados['vagas'])
    else:
        print("[AVISO]: Nenhuma vaga nova encontrada. JSON não atualizado.")
    
    print("=" * 60)


if __name__ == "__main__":
    iniciar_scraping()