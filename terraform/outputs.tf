output "resource_group_name" {
  description = "Resource Group criado para o projeto."
  value       = azurerm_resource_group.main.name
}

output "api_url" {
  description = "URL publica da API."
  value       = "https://${azurerm_linux_web_app.api.default_hostname}"
}

output "api_url_with_path" {
  description = "URL usada pelo frontend para chamar a API."
  value       = "https://${azurerm_linux_web_app.api.default_hostname}/api"
}

output "frontend_url" {
  description = "URL publica do frontend."
  value       = azurerm_storage_account.data.primary_web_endpoint
}

output "storage_account_name" {
  description = "Nome da conta de Storage usada pela tabela e pelo frontend."
  value       = azurerm_storage_account.data.name
}
