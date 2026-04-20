"""
main_linkedin.py — Entry point do scraper LinkedIn.

Rodado por: .github/workflows/linkedin.yml
Consome:    queries/tecnologia_linkedin.json + queries/advogados_linkedin.json
Publica em: /vagas/dev/linkedin + /vagas/adv/linkedin (Firebase Realtime DB)

A orquestração propriamente dita vive em scraper_runner.py
(DRY — mesmo código compartilhado com main_gupy.py).
"""
from scrapers.linkedin_scraper import LinkedinScraper
from scraper_runner import executar

CATEGORIAS = {
    "dev": {
        "queries": "queries/tecnologia_linkedin.json",
        "rota":    "/vagas/dev/linkedin",
    },
    "adv": {
        "queries": "queries/advogados_linkedin.json",
        "rota":    "/vagas/adv/linkedin",
    },
}


if __name__ == "__main__":
    executar(
        scraper=LinkedinScraper(),
        plataforma="linkedin",
        categorias=CATEGORIAS,
    )