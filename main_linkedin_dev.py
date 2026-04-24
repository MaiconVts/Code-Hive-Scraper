"""
main_linkedin_dev.py — Entry point do scraper LinkedIn para categoria DEV.

Rodado por: .github/workflows/linkedin-dev.yml
Consome:    queries/tecnologia_linkedin.json
Publica em: /vagas/dev/linkedin (Firebase Realtime DB)

A orquestração propriamente dita vive em scraper_runner.py
(DRY — mesmo código compartilhado com main_gupy.py e main_linkedin_adv.py).

Por que split DEV/ADV?
O hard limit de 6h do GitHub Actions não comporta DEV + ADV no mesmo job
(DEV sozinho já ocupa ~2h40min com anti-detecção ativa). Separar em dois
workflows com crons distintos garante que ADV sempre executa, além de
isolar falhas (se DEV quebrar, ADV roda independente).
"""
from scrapers.linkedin_scraper import LinkedinScraper
from scraper_runner import executar

CATEGORIAS = {
    "dev": {
        "queries": "queries/tecnologia_linkedin.json",
        "rota":    "/vagas/dev/linkedin",
    },
}

if __name__ == "__main__":
    executar(
        scraper=LinkedinScraper(),
        plataforma="linkedin-dev",
        categorias=CATEGORIAS,
    )