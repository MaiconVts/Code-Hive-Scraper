"""
main_gupy.py — Entry point do scraper Gupy.

Rodado por: .github/workflows/gupy.yml
Consome:    queries/tecnologia_gupy.json + queries/advogados_gupy.json
Publica em: /vagas/dev/gupy + /vagas/adv/gupy (Firebase Realtime DB)

A orquestração propriamente dita vive em scraper_runner.py
(DRY — mesmo código compartilhado com main_linkedin.py).
"""
from scrapers.gupy_scraper import GupyScraper
from scraper_runner import executar

CATEGORIAS = {
    "dev": {
        "queries": "queries/tecnologia_gupy.json",
        "rota":    "/vagas/dev/gupy",
    },
    "adv": {
        "queries": "queries/advogados_gupy.json",
        "rota":    "/vagas/adv/gupy",
    },
}


if __name__ == "__main__":
    executar(
        scraper=GupyScraper(),
        plataforma="gupy",
        categorias=CATEGORIAS,
    )