# Web - Transfer Web

![Node.js](https://img.shields.io/badge/Node.js-18%2B-3C873A?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-16-111111?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-API%20backend-2D3748?style=for-the-badge&logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-via%20API-336791?style=for-the-badge&logo=postgresql&logoColor=white)

Frontend principal da plataforma Transfer Web, responsável pela experiência do usuário, navegação protegida, gestão de funcionários e visualização financeira da operação.

## Sumário

- Visão Geral
- Responsabilidades
- Stack Tecnológica
- Integração com a API
- Fluxo do Usuário
- Estrutura de Telas
- Componentes e Utilitários
- Variáveis de Ambiente
- Desenvolvimento Local
- Observações Operacionais

## Visão Geral

O app `apps/web` é a interface usada no dia a dia para operar a plataforma.

Porta local padrão:

- `http://localhost:3030`

## Responsabilidades

- login, cadastro e recuperação de acesso
- navegação autenticada
- dashboard principal
- listagem e cadastro de funcionários
- painel financeiro individual do funcionário
- cadastro de veículos
- criação, edição e exclusão de lançamentos
- filtros operacionais
- histórico paginado
- exportação de relatórios mensais

## Stack Tecnológica

- Next.js 16 com App Router
- React 19
- TypeScript
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

## Integração com a API

O frontend usa rotas `/api/*` locais, mas o app possui rewrite para encaminhar essas chamadas para a API em `http://localhost:3000`.

Na prática:

- o usuário navega em `http://localhost:3030`
- chamadas para `/api/...` saem do frontend
- o rewrite encaminha para `apps/api`

Isso simplifica o código cliente e mantém o mesmo hostname para a UI.

## Fluxo do Usuário

### Autenticação

Telas:

- `/auth/login`
- `/auth/register`
- `/auth/forgot`

Após autenticação, o usuário é redirecionado para o dashboard.

### Dashboard

Tela:

- `/dashboard`

Exibe contexto inicial e empresa logada, funcionando como ponto de entrada para o módulo de funcionários.

### Funcionários

Telas:

- `/funcionarios`
- `/funcionarios/cadastrar`
- `/funcionarios/[id]`

Fluxos:

- listar funcionários cadastrados
- cadastrar novo funcionário
- abrir painel financeiro do funcionário

### Painel financeiro do funcionário

Tela:

- `/funcionarios/[id]`

Recursos disponíveis:

- resumo consolidado do período
- resumo por veículo
- gráfico por carro com lucro, gastos e km
- filtros por período, veículo e categoria
- histórico paginado
- cadastro de veículos
- criação, edição e exclusão de lançamentos
- exportação mensal em Excel e PDF visual

## Estrutura de Telas

```text
app/
  auth/
    login/
    register/
    forgot/
  dashboard/
  funcionarios/
    page.tsx
    cadastrar/
    [id]/
  components/
  lib/
```

## Componentes e Utilitários

### Cabeçalho autenticado

Arquivo:

- `app/components/authenticated-header.tsx`

Responsável por:

- exibir título e subtítulo
- mostrar usuário autenticado
- indicar tempo de sessão
- permitir logout

### Cliente HTTP

Arquivo:

- `app/lib/http.ts`

Responsável por:

- centralizar `fetch`
- tratar erros HTTP
- detectar `401`
- tentar renovar sessão automaticamente
- redirecionar para login quando necessário

### Integração com sessão

Quando a API responde `401`, o frontend:

- tenta renovar sessão via `/api/auth/session`
- refaz a requisição original quando possível
- redireciona para login se a sessão expirou

## Variáveis de Ambiente

| Variável | Obrigatória | Uso | Exemplo |
| --- | --- | --- | --- |
| `API_BASE_URL` | Sim para produção | Base da API usada pelo rewrite de `/api/*`; em local pode continuar apontando para `http://localhost:3000` | `https://transfer-web-api.vercel.app` |
| `AUTH_SESSION_SECRET` | Recomendado | Usada pelo app web para validar localmente o token de acesso; deve ser igual ao valor da API | `uma-chave-longa-e-aleatoria` |
| `NODE_ENV` | Não | Comportamento padrão do Next.js em desenvolvimento e produção | `development` |

### Exemplo de `.env.local`

```env
API_BASE_URL="http://localhost:3000"
AUTH_SESSION_SECRET="uma-chave-longa-e-aleatoria"
```

### Observação importante

- o rewrite para `/api/:path*` usa `API_BASE_URL`
- sem `API_BASE_URL`, o fallback continua sendo `http://localhost:3000` apenas em desenvolvimento
- em produção, o build do app `web` falha sem `API_BASE_URL` para evitar deploy com `/api/*` quebrado
- em produção, configure `API_BASE_URL` com a URL pública do projeto `apps/api` na Vercel

## Desenvolvimento Local

### Rodar apenas o frontend

No root do monorepo:

```sh
npm run dev:web
```

Ou dentro de `apps/web`:

```sh
npm run dev
```

### Build

```sh
npm run build -w web
```

### Typecheck

```sh
npm run check-types -w web
```

## Observações Operacionais

- o frontend depende da API configurada em `API_BASE_URL` para autenticação, funcionários e relatórios
- se o app abrir mas as rotas `/api/*` falharem, normalmente o problema está no backend local
- o fluxo mais estável no monorepo é subir `api` e `web` juntos pelo comando do root
