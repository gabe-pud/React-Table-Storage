variable "subscription_id" {
  description = "ID da subscription Azure usada no deploy."
  type        = string
}

variable "location" {
  description = "Regiao Azure para os recursos."
  type        = string
  default     = "brazilsouth"
}

variable "project_name" {
  description = "Prefixo usado nos nomes dos recursos. Use apenas letras minusculas e numeros."
  type        = string
  default     = "contactledger"

  validation {
    condition     = can(regex("^[a-z0-9]{3,18}$", var.project_name))
    error_message = "project_name deve ter de 3 a 18 caracteres, usando apenas letras minusculas e numeros."
  }
}

variable "environment" {
  description = "Ambiente de deploy."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment deve ser dev, staging ou prod."
  }
}

variable "api_sku" {
  description = "SKU do App Service Plan da API."
  type        = string
  default     = "B1"
}

variable "table_name" {
  description = "Nome da tabela Azure Table Storage."
  type        = string
  default     = "Contacts"
}
