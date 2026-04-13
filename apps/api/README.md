# API - Transfer Web

![Node.js](https://img.shields.io/badge/Node.js-18%2B-3C873A?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-111111?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-336791?style=for-the-badge&logo=postgresql&logoColor=white)

Backend da plataforma Transfer Web, responsável por autenticação, sessão persistente, cadastro de funcionários, veículos, lançamentos financeiros e relatórios.

## Sumário

- Visão Geral
- Responsabilidades
- Stack Tecnológica
- Estrutura do App
- Modelagem de Dados
- Variáveis de Ambiente
- Rotas da API
- Filtros e Paginação
- Relatórios
- Desenvolvimento Local
- Observações Operacionais

## Visão Geral

O app `apps/api` concentra a camada de servidor da plataforma e expõe rotas HTTP via App Router do Next.js.

Porta local padrão:

- `http://localhost:3000`

## Responsabilidades

- autenticação e sessão
- contexto da empresa logada
- cadastro e listagem de funcionários
- cadastro de veículos por funcionário
- criação, edição e exclusão de lançamentos financeiros
- cálculo de indicadores financeiros
- filtros e paginação do histórico
- exportação de fechamento mensal em Excel e PDF

## Stack Tecnológica

- Next.js 16
- TypeScript
- Prisma ORM
- PostgreSQL
- `bcryptjs`
- `jose`
- `exceljs`
- `pdfkit`

## Estrutura do App

```text
apps/api/
  prisma/
    schema.prisma
    migrations/
  src/
    app/
      api/
        auth/
        empresa-logada/
        drivers/
        funcionarios/
```

## Modelagem de Dados

### Entidades principais

- `User`
- `Session`
- `Funcionario`
- `Veiculo`
- `FuncionarioLancamento`
- `Driver`

### Relacionamentos relevantes

- um `User` possui várias `Session`
- um `Funcionario` possui vários `Veiculo`
- um `Funcionario` possui vários `FuncionarioLancamento`
- um `Veiculo` pode estar vinculado a vários `FuncionarioLancamento`

### Enums de domínio

- `LancamentoTipo`: `GANHO`, `GASTO`
- `LancamentoCategoria`: `UBER`, `N99`, `BLABLACAR`, `TRANSFER`, `PARTICULAR`, `RECARGA`, `PEDAGIOS`, `LIMPEZA`, `REVISAO`, `MANUTENCAO`

## Variáveis de Ambiente

| Variável | Obrigatória | Uso | Exemplo |
| --- | --- | --- | --- |
| `DATABASE_URL` | Sim | String de conexão do Prisma para PostgreSQL | `postgresql://postgres:postgres@localhost:5432/transfer_web` |
| `AUTH_SESSION_SECRET` | Sim em produção | Segredo usado para assinar e validar a sessão persistente | `uma-chave-longa-e-aleatoria` |
| `NODE_ENV` | Não | Controla cookies `secure` e comportamento de runtime; a Vercel define automaticamente em produção | `development` |

### Exemplo de `.env`

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/transfer_web"
AUTH_SESSION_SECRET="uma-chave-longa-e-aleatoria"
```

## Rotas da API

| Método | Rota | Finalidade | Autenticação |
| --- | --- | --- | --- |
| `POST` | `/api/auth/register` | Criar usuário e iniciar sessão | Não |
| `POST` | `/api/auth/login` | Validar credenciais e iniciar sessão | Não |
| `POST` | `/api/auth/logout` | Encerrar sessão atual | Sim |
| `GET` | `/api/auth/session` | Validar ou renovar sessão | Sim |
| `POST` | `/api/auth/forgot` | Iniciar recuperação de senha | Não |
| `GET` | `/api/empresa-logada` | Retornar contexto da empresa | Sim |
| `GET` | `/api/funcionarios` | Listar funcionários | Sim |
| `POST` | `/api/funcionarios/cadastrar` | Cadastrar funcionário | Sim |
| `GET` | `/api/funcionarios/[id]` | Retornar painel financeiro detalhado | Sim |
| `POST` | `/api/funcionarios/[id]/veiculos` | Cadastrar veículo do funcionário | Sim |
| `POST` | `/api/funcionarios/[id]/lancamentos` | Criar lançamento financeiro | Sim |
| `PATCH` | `/api/funcionarios/[id]/lancamentos/[lancamentoId]` | Editar lançamento | Sim |
| `DELETE` | `/api/funcionarios/[id]/lancamentos/[lancamentoId]` | Excluir lançamento | Sim |
| `GET` | `/api/funcionarios/[id]/relatorio` | Exportar fechamento mensal | Sim |
| `GET` | `/api/drivers` | Listar drivers | Sim |
| `GET` | `/api/drivers/[id]` | Consultar driver por id | Sim |

## Filtros e Paginação

A rota `GET /api/funcionarios/[id]` suporta:

- `period=day|week|month`
- `veiculoId=<id>`
- `categories=UBER,RECARGA,...`
- `page=<numero>`
- `pageSize=<numero>`

O retorno inclui:

- `funcionario`
- `filtros`
- `pagination`
- `veiculos`
- `resumo`
- `resumoPorVeiculo`
- `lancamentos`

Indicadores calculados no backend:

- ganhos totais
- gastos totais
- saldo
- km total
- custo por km
- ganho por km

## Relatórios

### Excel

- aba de resumo mensal
- aba de lançamentos detalhados
- formatação monetária e de data

### PDF visual

- cabeçalho visual de marca
- cards com indicadores principais
- resumo do funcionário e do período
- lista dos lançamentos do mês

Logo opcional em `apps/api/public/`:

- `company-logo.png`
- `company-logo.jpg`
- `company-logo.jpeg`

Sem logo real, o sistema usa um badge visual como fallback.

## Desenvolvimento Local

### Pré-requisitos

- Node.js 18+
- PostgreSQL disponível
- `DATABASE_URL` configurada no `.env`
- `AUTH_SESSION_SECRET` definida para evitar o fallback de desenvolvimento

### Rodar apenas a API

No root do monorepo:

```sh
npm run dev:api
```

Ou dentro de `apps/api`:

```sh
npm run dev
```

### Build

```sh
npm run build -w api
```

### Build de produção com migrations

```sh
npm run build:production -w api
```

## Observações Operacionais

- o frontend principal em `apps/web` consome esta API via rewrite de `/api/*` para a `API_BASE_URL` configurada no frontend
- reiniciar apenas a API costuma resolver falhas intermitentes de hot reload no desenvolvimento local
- a consistência do domínio financeiro depende da validação de tipo, categoria, veículo e data no backend

## Deploy na Vercel

Configuração recomendada do projeto `apps/api`:

- Root Directory: `apps/api`
- Framework Preset: `Next.js`
- Build Command: `npm run vercel-build`

Variáveis de ambiente realmente necessárias para deploy:

- `DATABASE_URL`
- `AUTH_SESSION_SECRET`

Observações:

- `NODE_ENV` não precisa ser cadastrada manualmente na Vercel
- `vercel-build` roda `prisma generate`, aplica `prisma migrate deploy` e só depois executa `next build`
- o banco precisa estar acessível a partir da infraestrutura da Vercel durante o build e em runtime
