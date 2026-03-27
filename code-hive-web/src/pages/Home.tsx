// Exemplo genérico de navegação
import { Link } from 'react-router-dom'

export default function Home() {
  return (
    <div>
      <Link to="/vagas-dev">Ir para vagas de desenvolvimento</Link>
      <Link to="/vagas-adv">Ir para vagas de advocacia</Link>
    </div>
  )
}