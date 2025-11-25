# MEU SHAPE - Front-end

Aplicação React + Tailwind que evoluiu do sistema de e-books para um hub completo de treino, nutrição e evolução corporal. Enquanto o backend/Supabase será integrado em breve, o front já reflete todo o branding fitness, fluxos principais e componentes reutilizáveis.

## Principais seções

- **Panorama do Shape** - Dashboard com treino do dia, calorias restantes, gráfico de peso e linha do tempo.
- **Treinos** - Biblioteca com filtros por objetivo/nível, cards com séries, vídeos e execução guiada.
- **Coach IA** - Chat com prompts inteligentes e contexto dinâmico (objetivo, calorias, equipamentos).
- **Nutrição** - Plano alimentar, macros, refeições e receitas rápidas.
- **Evolução** - Peso, medidas, PRs e fotos antes/depois.
- **Perfil & Plano** - Dados pessoais, preferências e assinatura SaaS.

## Scripts

```bash
npm install
npm run dev     # ambiente local
npm run build   # bundle de produção
```

## Próximos passos

- Conectar Supabase às tabelas de treinos, execuções, nutrição e evolução.
- Ligar o fluxo de checkout/planos ao gateway (Mercado Pago/Stripe).
- Substituir os dados demonstrativos do arquivo `src/data/fitness.js` pelos dados reais.
