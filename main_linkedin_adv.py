"""
main_linkedin_adv.py — Entry point do scraper LinkedIn para categoria ADV.

Rodado por: .github/workflows/linkedin-adv.yml
Consome:    queries/advogados_linkedin.json
Publica em: /vagas/adv/linkedin (Firebase Realtime DB)

A orquestração propriamente dita vive em scraper_runner.py
(DRY — mesmo código compartilhado com main_gupy.py e main_linkedin_dev.py).

Por que split DEV/ADV?
O hard limit de 6h do GitHub Actions não comporta DEV + ADV no mesmo job
(DEV sozinho já ocupa ~2h40min com anti-detecção ativa). Separar em dois
workflows com crons distintos garante que ADV sempre executa, além de
isolar falhas (se DEV quebrar, ADV roda independente).
"""
from scrapers.linkedin_scraper import LinkedinScraper
from scraper_runner import executar

CATEGORIAS = {
    "adv": {
        "queries": "queries/advogados_linkedin.json",
        "rota":    "/vagas/adv/linkedin",
    },
}

if __name__ == "__main__":
    executar(
        scraper=LinkedinScraper(),
        plataforma="linkedin-adv",
        categorias=CATEGORIAS,
    )