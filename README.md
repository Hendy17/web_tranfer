# Transfer Web

![Node.js](https://img.shields.io/badge/Node.js-18%2B-3C873A?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-111111?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=for-the-badge&logo=postgresql&logoColor=white)

Plataforma web para gestão operacional e financeira de funcionários e veículos usados em uma operação de transporte executivo, com foco em controle de ganhos, gastos, quilometragem e fechamento mensal.

## Sumário

- Visão Geral
- Capacidades da Plataforma
- Stack Tecnológica
- Estrutura do Monorepo
- Variáveis de Ambiente
- Fluxo Principal do Produto
- Rotas da API
- Desenvolvimento Local
- Exportações e Relatórios
- Observações Operacionais

## Visão Geral

O projeto foi organizado como monorepo e hoje cobre o fluxo completo de operação local:

- autenticação com sessão persistente
- dashboard com contexto da empresa logada
- cadastro e listagem de funcionários
- painel financeiro individual por funcionário
- cadastro de veículos por funcionário
- lançamentos de ganhos e gastos por veículo
- filtros por período, veículo e categoria
- histórico paginado
- resumo consolidado e resumo por veículo
- gráfico comparativo por carro
- exportação mensal em Excel e PDF visual

## Capacidades da Plataforma

### Domínio de negócio

- funcionários
- veículos
- lançamentos financeiros
- controle de quilometragem por lançamento
- ganho por km
- custo por km
- saldo operacional

### Categorias de ganho

- Uber
- 99
- Blablacar
- Transfer
- Corrida particular

### Categorias de gasto

- Recarga
- Limpeza
- Revisão
- Manutenção

## Stack Tecnológica

### Monorepo e tooling

- Turborepo
- npm workspaces
- TypeScript
- ESLint
- Prettier

### Frontend

- Next.js 16 com App Router
- React 19
- Ant Design
- Recharts
- SWR
- Tailwind CSS 4
- `@ant-design/icons`
- `lucide-react`
- `clsx`
- `tailwind-merge`
- `class-variance-authority`
- `tw-animate-css`

### Backend

- Next.js 16
- Prisma ORM
- PostgreSQL
- `bcryptjs`
- `jose`
- `exceljs`
- `pdfkit`

### Entidades principais

- `User`
- `Session`
- `Funcionario`
- `Veiculo`
- `FuncionarioLancamento`
- `Driver`
- `LancamentoTipo`
- `LancamentoCategoria`

## Estrutura do Monorepo

```text
apps/
  api/   -> backend, autenticação, funcionários, lançamentos, relatórios
  web/   -> frontend principal da plataforma
  docs/  -> app de documentação

packages/
  ui/
  common-types/
  eslint-config/
  typescript-config/
```

## Variáveis de Ambiente

O monorepo não depende de um único arquivo global obrigatório, mas o fluxo principal usa estas variáveis:

| Escopo | Variável | Obrigatória | Uso | Exemplo |
| --- | --- | --- | --- | --- |
| `root` | `DATABASE_URL` | Sim para `apps/api` | String de conexão do PostgreSQL usada pelo Prisma | `postgresql://postgres:postgres@localhost:5432/transfer_web` |
| `root` | `AUTH_SESSION_SECRET` | Sim em produção | Segredo usado para assinar e validar tokens de sessão no backend e no frontend | `uma-chave-longa-e-aleatoria` |
| `apps/api` | `DATABASE_URL` | Sim | Necessária para consultas Prisma, autenticação persistente e relatórios | `postgresql://postgres:postgres@localhost:5432/transfer_web` |
| `apps/api` | `AUTH_SESSION_SECRET` | Sim em produção | Assinatura dos cookies e JWTs de acesso/renovação | `uma-chave-longa-e-aleatoria` |
| `apps/web` | `AUTH_SESSION_SECRET` | Recomendado | Usada para validar o token de sessão no app web; deve ser igual à da API | `uma-chave-longa-e-aleatoria` |

### Sugestão prática

- no desenvolvimento local, você pode manter `DATABASE_URL` e `AUTH_SESSION_SECRET` em `apps/api/.env`
- se quiser que o app web valide a sessão com a mesma chave, replique `AUTH_SESSION_SECRET` em `apps/web/.env.local`
- em produção, `AUTH_SESSION_SECRET` deve existir em ambos os apps com exatamente o mesmo valor

## Fluxo Principal do Produto

1. O usuário cria conta ou faz login.
2. O sistema cria e mantém uma sessão persistente.
3. O usuário acessa o dashboard.
4. O usuário cadastra funcionários.
5. Para cada funcionário, cadastra veículos usados na operação.
6. Registra ganhos e gastos vinculando categoria, valor, data e veículo.
7. O backend consolida indicadores por período.
8. O frontend exibe KPIs, histórico, gráfico por veículo e filtros.
9. O usuário exporta o fechamento mensal em Excel ou PDF.

## Rotas da API

| Método | Rota | Finalidade |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Criar usuário e iniciar sessão |
| `POST` | `/api/auth/login` | Autenticar usuário |
| `POST` | `/api/auth/logout` | Encerrar sessão |
| `GET` | `/api/auth/session` | Validar ou renovar sessão |
| `POST` | `/api/auth/forgot` | Iniciar recuperação de senha |
| `GET` | `/api/empresa-logada` | Retornar contexto da empresa |
| `GET` | `/api/funcionarios` | Listar funcionários |
| `POST` | `/api/funcionarios/cadastrar` | Cadastrar funcionário |
| `GET` | `/api/funcionarios/[id]` | Painel financeiro detalhado do funcionário |
| `POST` | `/api/funcionarios/[id]/veiculos` | Cadastrar veículo do funcionário |
| `POST` | `/api/funcionarios/[id]/lancamentos` | Criar lançamento financeiro |
| `PATCH` | `/api/funcionarios/[id]/lancamentos/[lancamentoId]` | Editar lançamento |
| `DELETE` | `/api/funcionarios/[id]/lancamentos/[lancamentoId]` | Excluir lançamento |
| `GET` | `/api/funcionarios/[id]/relatorio` | Exportar fechamento mensal em XLSX ou PDF |
| `GET` | `/api/drivers` | Listar drivers |
| `GET` | `/api/drivers/[id]` | Obter driver por id |

## Desenvolvimento Local

### Pré-requisitos

- Node.js 18+
- npm 11+
- PostgreSQL disponível
- `DATABASE_URL` configurada para a API

### Instalação

```sh
npm install
```

### Fluxo principal de desenvolvimento

```sh
npm run dev
```

Esse comando sobe apenas:

- `apps/api` em `http://localhost:3000`
- `apps/web` em `http://localhost:3030`

### Outros comandos úteis

```sh
npm run dev:all
npm run dev:web
npm run dev:api
npm run build
npm run check-types
```

## Exportações e Relatórios

O sistema gera fechamento mensal em:

- Excel com resumo e lançamentos detalhados
- PDF visual com branding, KPIs e histórico resumido

O PDF suporta logo real quando existir um dos arquivos abaixo em `apps/api/public/`:

- `company-logo.png`
- `company-logo.jpg`
- `company-logo.jpeg`

Sem logo real, o sistema usa um badge visual como fallback.

## Observações Operacionais

- Evite rodar `npm run dev` no root ao mesmo tempo em que já existe um `next dev` ativo em `apps/web` ou `apps/api`.
- Se aparecer erro de porta em uso, verifique processos em `3000` e `3030`.
- Se o frontend responder mas alguma rota `/api/*` falhar durante hot reload, reinicie apenas a API com `npm run dev:api`.
- O app `docs` não é necessário para o fluxo principal de cadastro, login, funcionários e relatórios.
