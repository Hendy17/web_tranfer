# Transfer Web

Monorepo com frontend Next.js em `apps/web`, API Next.js em `apps/api` e app de documentação em `apps/docs`.

## Fluxo recomendado de desenvolvimento

Use o comando abaixo no root do repositório:

```sh
npm run dev
```

Esse comando sobe apenas os serviços necessários para o fluxo principal da aplicação:

- `apps/api` em `http://localhost:3000`
- `apps/web` em `http://localhost:3030`

O frontend já faz rewrite de `/api/*` para a API em `localhost:3000`, então esse é o caminho mais estável para trabalhar sem ruído de outros apps do monorepo.

## Outros comandos úteis

Subir tudo, incluindo `docs`:

```sh
npm run dev:all
```

Subir apenas o frontend:

```sh
npm run dev:web
```

Subir apenas a API:

```sh
npm run dev:api
```

## Build

Para validar o monorepo inteiro:

```sh
npm run build
```

Para validar apenas um app:

```sh
npm run build -w web
npm run build -w api
```

## Observações operacionais

- Evite rodar `npm run dev` no root ao mesmo tempo em que já existe um `next dev` ativo em `apps/web` ou `apps/api`.
- Se aparecer erro de porta em uso, verifique processos já abertos em `3000` e `3030`.
- Se o frontend responder mas alguma rota `/api/*` falhar durante hot reload, reinicie apenas a API com `npm run dev:api`.
- O app `docs` não é necessário para o fluxo principal de cadastro, login, funcionários e relatórios.

# web_tranfer
