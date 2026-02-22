# scrapers/base_scraper.py
from abc import ABC, abstractmethod
import requests
import random
import time
import hashlib # Para criar hashes únicos a partir de URLs ou títulos, se necessário.

class BaseScraper(ABC):
    """
    Classe Abstrata que define o contrato obrigatório para todos os scrapers.
    Padrão de Projeto: Template Method.
    """
    def gerar_id_deterministico(self, link: str) -> str:
        """ Gera um ID único e determinístico a partir de uma URL. """
        return hashlib.md5(link.encode('utf-8')).hexdigest()[:16]  # Retorna os primeiros 16 caracteres do hash para um ID compacto
    
    def __init__(self, nome_plataforma: str):
        self.nome_plataforma = nome_plataforma
        
        # Simula navegadores reais para burlar bloqueios primários 
        self.headers_padrao = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        }
        
    @abstractmethod
    def buscar_vagas(self, palavra_chave: str, modalidade: str) -> list:
        """
        Método abstrato. Obriga as classes filhas (Gupy, LinkedIn, etc) 
        a implementarem sua própria lógica de busca na web ou API.
        """
        pass
    
    def padronizar_vaga(self, id_vaga: str, titulo: str, empresa: str, modalidade: str, link: str, data_pub: str) -> dict:
        """ Complexidade de Tempo: $O(1)$ para a criação do registro. """
        return {
            "id": id_vaga,
            "titulo": titulo,
            "empresa": empresa,
            "modalidade": modalidade,
            "link": link,
            "data_publicacao": data_pub,
            "origem": self.nome_plataforma
        }
    def fazer_requisicao_segura(self, url: str, params: dict = None) -> requests.Response:
        """
        Algoritmo Anti-Bloqueio: Exponential Backoff com Jitter.
        Evita bans permanentes (Rate Limiting) ao lidar com grandes volumes de dados.
        """
        tentativas_maximas = 4
        
        for tentativa in range(tentativas_maximas):
            try:
                # Simula o delay humano de leitura antes de fazer a requisição(Jitter)
                delay_humano = random.uniform(1.5, 3.5)  # Entre 1.5 e 3.5 segundos
                time.sleep(delay_humano)
                
                response = requests.get(url, headers=self.headers_padrao, params=params, timeout=15)
                
                # Se o status for 429 (Too Many Requests), aplica o Exponential Backoff forçando o erro cair no backoff
                if response.status_code == 429:
                    raise requests.exceptions.RequestException("Rate Limit Excedido (HTTP 429)")
                
                response.raise_for_status()  # Lança um erro para códigos de status 4xx ou 5xx
                return response
            
            except requests.exceptions.RequestException as e:
                if tentativa == tentativas_maximas - 1:
                    print(f"    [FALHA CRÍTICA]: Limite de tentativas excedido para a URL. Abortando. Erro: {e}")
                    raise e # Desiste após 4 tentativas para não travar o script para sempre
                
                # Exponential Backoff: (ex.: 2, 4, 8 segundos) + Jitter de 1 a 2 segundos
                tempo_espera = (2 ** tentativa) + random.uniform(1, 2)
                print(f"    [ANTI-BAN]: Conexão negada/lenta. Aguardando {tempo_espera:.2f}s antes de tentar novamente... (Tentativa {tentativa+1}/{tentativas_maximas})")
                time.sleep(tempo_espera)