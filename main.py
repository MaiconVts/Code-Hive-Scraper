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
    """Função principoal que orquestra as buscas."""
    print("="*60)
    print("INICIANDO AS BUSCAS DE VAGAS PARA O CODE HIVE!")
    print("="*60)
    
    config = carregar_configuracoes()
    if not config:
        return
    palavras_chave = config['filtros_de_busca']['palavras_chave']
    modalidades = config['filtros_de_busca']['modalidades']
    plataformas = config['configuracoes_gerais']['plataformas_alvo']
    
    print(f"Configurações carregadas: {len(palavras_chave)} palavras-chave, {len(modalidades)} modalidades, {len(plataformas)} plataformas.")
    print(f"Plataformas alvo: {', '.join(plataformas).upper()}")
    print("-"*60)
    
    urls_vistas = set()  # Tabelas Hash para deduplicação
    todas_as_vagas = []
    total_combinacoes = 0
    
    # Loop Principal: Plataforma -> Palavra-Chave -> Modalidade
    for plataforma in plataformas:
        nome_plataforma = plataforma.lower()
        
        # 1 - Roteamento: Verifica se o scraper existe no dicionario
        if nome_plataforma not in SCRAPERS_DISPONIVEIS:
            print(f"[AVISO]: Plataforma '{plataforma}' não tem um scraper implementado. Pulando...")
            continue
        
        # 2 - Pega a instância do scraper correspondente(*Classe criada la em cima)
        scraper = SCRAPERS_DISPONIVEIS[nome_plataforma]

        for palavra in palavras_chave:
            for modalidade in modalidades:
                total_combinacoes += 1
                
                print(f"[INFO]: Buscando por '{palavra}' na modalidade '{modalidade}' na plataforma '{plataforma}'...")
                
                # 3 - Chama o metodo padronizado da classe abstrata
                vagas_encontradas = scraper.buscar_vagas(palavra, modalidade)
                
                if vagas_encontradas:
                    vagas_unicas = []
                    duplicadas = 0
                    
                    # Filtro o(1) usando Set para evitar lixo no JSON
                    for vaga in vagas_encontradas:
                        if vaga['link'] not in urls_vistas:
                            urls_vistas.add(vaga['link'])
                            vagas_unicas.append(vaga)
                        else:
                            duplicadas += 1
                            
                    if vagas_unicas:
                        print(f"[SUCESSO]: Encontradas {len(vagas_unicas)} vagas únicas para '{palavra}' na modalidade '{modalidade}' na plataforma '{plataforma}'.")
                        todas_as_vagas.extend(vagas_unicas)
                    else:
                        print(f"[AVISO]: Foram encontradas vagas, mas todas já estavam no banco de dados.")    
                else:
                    print(f"[AVISO]: Nenhuma vaga encontrada para '{palavra}' na modalidade '{modalidade}' na plataforma '{plataforma}'.")                    
                # Delay etico entre as requisições para evitar bloqueios (pode ser ajustado conforme necessário)
                
    print("-"*60)
    print(f"Orquestração finalizada! Total de combinações pesquisadas: {total_combinacoes}")

    # Salva os resultados no arquivo JSON
    if todas_as_vagas:
        salvar_dados_atomico(todas_as_vagas)
    else:
        print("[AVISO]: Nenhuma vaga nova foi encontrada. O arquivo JSON não será atualizado.")
    print("="*60)
    
# Ponto de entrada do script
if __name__ == "__main__":
    iniciar_scraping()
