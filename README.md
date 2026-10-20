# React Table Storage

Aplicacao web simples para cadastrar e consultar contatos usando React no frontend, Node/Express no backend e Azure Table Storage como persistencia.

## Desenvolvido Por:

- Gabriel Garcia
- Levi Ferreira
- Thiago de Almeida
- André Luiz

## Requisitos

- Node.js 18 ou superior
- Uma conta de Storage no Azure para usar a persistencia real

## Como executar

Na raiz do projeto:

```bash
npm install
npm run install:all
```

Copie `.env.example` para `server/.env` e preencha `AZURE_STORAGE_CONNECTION_STRING` quando quiser usar o Azure localmente. Para apontar o frontend para outra API, copie `client/.env.example` para `client/.env`.

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

Sem a variavel de conexao do Azure, a API usa dados em memoria para facilitar o desenvolvimento local. Os dados serao perdidos ao reiniciar o servidor.

## Modelo da tabela

A tabela `Contacts` usa `PartitionKey` fixo como `contacts` e um `RowKey` UUID. Cada entidade possui no minimo quatro atributos de negocio:

- `name`
- `email`
- `department`
- `status`

A API oferece:

- `GET /api/contacts`
- `POST /api/contacts`
- `PUT /api/contacts/:id`
- `DELETE /api/contacts/:id`

## Deploy na Azure com Terraform

O diretório `terraform/` cria:

- Resource Group
- Storage Account e tabela `Contacts`
- App Service Linux para a API Node
- Static Website no Storage Account para o frontend React

Se aparecer `Output "static_web_app_deployment_token" not found`, o comando executado ainda pertence à configuração antiga. Esse output não existe mais porque o Static Web App foi substituído pelo Static Website do Storage Account; execute novamente `terraform apply` e use os comandos de publicação abaixo.

Pré-requisitos: Azure CLI autenticada (`az login`), Terraform 1.6+ e Node.js 18+.

```bash
az login
cd terraform
cp terraform.tfvars.example terraform.tfvars
# edite terraform.tfvars e informe sua subscription_id
terraform init
terraform plan
terraform apply
```

Depois do provisionamento, publique a API e o frontend:

> Importante: nao use `npx @azure/static-web-apps-cli deploy`. Esse comando tenta criar um recurso Static Web Apps separado e e bloqueado pela policy da subscription. O frontend desta infraestrutura e publicado no `$web` do Storage Account com `az storage blob upload-batch`.

```bash
cd ..
npm install
npm run install:all
cd server
zip -r ../api.zip . -x 'node_modules/*'
cd ..
az webapp deployment source config-zip \
	--resource-group "$(terraform -chdir=terraform output -raw resource_group_name)" \
	--name "app-contactledger-dev" \
	--src api.zip
VITE_API_URL="$(terraform -chdir=terraform output -raw api_url_with_path)" npm run build --prefix client
az storage blob upload-batch \
	--account-name "$(terraform -chdir=terraform output -raw storage_account_name)" \
	--account-key "$(az storage account keys list --resource-group "$(terraform -chdir=terraform output -raw resource_group_name)" --account-name "$(terraform -chdir=terraform output -raw storage_account_name)" --query '[0].value' -o tsv)" \
	--destination '$web' \
	--source client/dist \
	--overwrite
```

O App Service executará `npm install` durante o deploy por causa de `SCM_DO_BUILD_DURING_DEPLOYMENT=true`. O frontend usa o endpoint estático do Storage Account e a API usa o hostname do App Service. As URLs finais podem ser consultadas com `terraform output`.

Para consultar diretamente a URL do frontend:

```bash
terraform -chdir=terraform output frontend_url
```
