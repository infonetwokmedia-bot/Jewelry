################################################################################
# Makefile — Jewelry Miami (tujoyita.com)
# Comandos frecuentes para desarrollo y producción
################################################################################

.DEFAULT_GOAL := help
SHELL := /bin/bash

# Variables
COMPOSE := docker compose
WP_CLI := $(COMPOSE) run --rm wpcli wp --allow-root
MYSQL_CONTAINER := jewelry_mysql
BACKUP_DIR := backups
TIMESTAMP := $(shell date +%Y%m%d_%H%M%S)

# Producción
PROD_HOST := tujoyita-prod
PROD_DIR := /srv/stacks/tujoyita

# Colores
GREEN := \033[0;32m
YELLOW := \033[1;33m
RED := \033[0;31m
NC := \033[0m

##@ Desarrollo Local

.PHONY: dev
dev: ## Iniciar entorno de desarrollo
	@echo -e "$(GREEN)▶ Iniciando entorno local...$(NC)"
	$(COMPOSE) up -d
	@echo -e "$(GREEN)✔ Entorno activo$(NC)"
	@echo "  WordPress: https://jewelry.local.dev"
	@echo "  Admin:     https://jewelry.local.dev/wp-admin"
	@echo "  phpMyAdmin: https://phpmyadmin.jewelry.local.dev"

.PHONY: down
down: ## Detener entorno de desarrollo
	@echo -e "$(YELLOW)■ Deteniendo contenedores...$(NC)"
	$(COMPOSE) down
	@echo -e "$(GREEN)✔ Contenedores detenidos$(NC)"

.PHONY: restart
restart: down dev ## Reiniciar entorno de desarrollo

.PHONY: logs
logs: ## Ver logs de todos los contenedores
	$(COMPOSE) logs -f --tail=100

.PHONY: logs-wp
logs-wp: ## Ver logs solo de WordPress
	$(COMPOSE) logs -f --tail=100 wordpress

.PHONY: status
status: ## Ver estado de contenedores
	@echo -e "$(GREEN)Contenedores:$(NC)"
	@$(COMPOSE) ps
	@echo ""
	@echo -e "$(GREEN)Espacio en disco:$(NC)"
	@du -sh data/mysql data/wordpress 2>/dev/null || true

##@ WP-CLI

.PHONY: wp
wp: ## Ejecutar WP-CLI (uso: make wp CMD="plugin list")
	$(WP_CLI) $(CMD)

.PHONY: wp-plugins
wp-plugins: ## Listar plugins instalados
	$(WP_CLI) plugin list

.PHONY: wp-update
wp-update: ## Actualizar plugins y temas
	@echo -e "$(YELLOW)⟳ Actualizando plugins...$(NC)"
	$(WP_CLI) plugin update --all
	@echo -e "$(YELLOW)⟳ Actualizando temas...$(NC)"
	$(WP_CLI) theme update --all
	@echo -e "$(GREEN)✔ Actualización completa$(NC)"

.PHONY: wp-search-replace
wp-search-replace: ## Search-replace en la BD (uso: make wp-search-replace OLD="old.dev" NEW="new.com")
	$(WP_CLI) search-replace "$(OLD)" "$(NEW)" --all-tables --dry-run
	@echo ""
	@echo -e "$(YELLOW)⚠ Esto fue dry-run. Para aplicar:$(NC)"
	@echo "  $(WP_CLI) search-replace \"$(OLD)\" \"$(NEW)\" --all-tables"

##@ Base de Datos

.PHONY: backup
backup: ## Crear backup de la base de datos
	@mkdir -p $(BACKUP_DIR)
	@echo -e "$(YELLOW)📦 Creando backup...$(NC)"
	docker exec $(MYSQL_CONTAINER) mysqldump \
		-u root -p$$(grep MYSQL_ROOT_PASSWORD .env | cut -d= -f2) \
		$$(grep MYSQL_DATABASE .env | cut -d= -f2) \
		--single-transaction --routines --triggers \
		| gzip > $(BACKUP_DIR)/db_$(TIMESTAMP).sql.gz
	@echo -e "$(GREEN)✔ Backup: $(BACKUP_DIR)/db_$(TIMESTAMP).sql.gz$(NC)"
	@ls -lh $(BACKUP_DIR)/db_$(TIMESTAMP).sql.gz

.PHONY: backup-full
backup-full: backup ## Backup completo: BD + wp-content
	@echo -e "$(YELLOW)📦 Creando backup de wp-content...$(NC)"
	tar czf $(BACKUP_DIR)/wp-content_$(TIMESTAMP).tar.gz \
		--exclude='wp-content/cache' \
		--exclude='wp-content/upgrade' \
		-C data/wordpress wp-content
	@echo -e "$(GREEN)✔ Backup wp-content: $(BACKUP_DIR)/wp-content_$(TIMESTAMP).tar.gz$(NC)"

.PHONY: restore
restore: ## Restaurar último backup (o uso: make restore FILE=backups/db_xxx.sql.gz)
	@if [ -z "$(FILE)" ]; then \
		FILE=$$(ls -t $(BACKUP_DIR)/db_*.sql.gz 2>/dev/null | head -1); \
		if [ -z "$$FILE" ]; then \
			echo -e "$(RED)✗ No hay backups disponibles$(NC)"; \
			exit 1; \
		fi; \
		echo -e "$(YELLOW)⟳ Restaurando: $$FILE$(NC)"; \
		gunzip -c "$$FILE" | docker exec -i $(MYSQL_CONTAINER) mysql \
			-u root -p$$(grep MYSQL_ROOT_PASSWORD .env | cut -d= -f2) \
			$$(grep MYSQL_DATABASE .env | cut -d= -f2); \
	else \
		echo -e "$(YELLOW)⟳ Restaurando: $(FILE)$(NC)"; \
		gunzip -c "$(FILE)" | docker exec -i $(MYSQL_CONTAINER) mysql \
			-u root -p$$(grep MYSQL_ROOT_PASSWORD .env | cut -d= -f2) \
			$$(grep MYSQL_DATABASE .env | cut -d= -f2); \
	fi
	@echo -e "$(GREEN)✔ Base de datos restaurada$(NC)"

.PHONY: backup-clean
backup-clean: ## Eliminar backups de más de 30 días
	@echo -e "$(YELLOW)🧹 Limpiando backups antiguos...$(NC)"
	find $(BACKUP_DIR) -name "*.sql.gz" -mtime +30 -delete -print
	find $(BACKUP_DIR) -name "*.tar.gz" -mtime +30 -delete -print
	@echo -e "$(GREEN)✔ Limpieza completa$(NC)"

##@ Cache y Optimización

.PHONY: cache-clear
cache-clear: ## Limpiar cache de WordPress
	$(WP_CLI) cache flush
	$(WP_CLI) transient delete --all
	@echo -e "$(GREEN)✔ Cache limpiado$(NC)"

.PHONY: optimize-images
optimize-images: ## Optimizar imágenes de productos
	@bash scripts/optimize-jewelry-images.sh

##@ Producción

.PHONY: deploy
deploy: ## Desplegar a producción (tujoyita.com)
	@echo -e "$(YELLOW)🚀 Desplegando a producción...$(NC)"
	@echo -e "$(YELLOW)   Paso 1: Backup de producción$(NC)"
	ssh $(PROD_HOST) "cd $(PROD_DIR) && docker exec tujoyita_mysql mysqldump \
		-u root -p\$$(grep MYSQL_ROOT_PASSWORD .env | cut -d= -f2) \
		\$$(grep MYSQL_DATABASE .env | cut -d= -f2) \
		--single-transaction | gzip > backups/pre-deploy_$$(date +%Y%m%d_%H%M%S).sql.gz"
	@echo -e "$(YELLOW)   Paso 2: Sincronizar wp-content$(NC)"
	rsync -avz --delete \
		--exclude='cache/' \
		--exclude='upgrade/' \
		--exclude='uploads/' \
		--exclude='wflogs/' \
		data/wordpress/wp-content/themes/ \
		$(PROD_HOST):$(PROD_DIR)/data/wordpress/wp-content/themes/
	rsync -avz --delete \
		--exclude='cache/' \
		data/wordpress/wp-content/mu-plugins/ \
		$(PROD_HOST):$(PROD_DIR)/data/wordpress/wp-content/mu-plugins/
	@echo -e "$(YELLOW)   Paso 3: Reiniciar WordPress$(NC)"
	ssh $(PROD_HOST) "cd $(PROD_DIR) && docker compose restart wordpress"
	@echo -e "$(GREEN)✔ Deploy completado$(NC)"
	@$(MAKE) --no-print-directory health-prod

.PHONY: health-prod
health-prod: ## Verificar salud del sitio en producción
	@echo -e "$(YELLOW)🏥 Health check: tujoyita.com$(NC)"
	@HTTP_CODE=$$(curl -s -o /dev/null -w "%{http_code}" https://tujoyita.com); \
	if [ "$$HTTP_CODE" = "200" ]; then \
		echo -e "  $(GREEN)✔ HTTPS: $$HTTP_CODE$(NC)"; \
	else \
		echo -e "  $(RED)✗ HTTPS: $$HTTP_CODE$(NC)"; \
	fi
	@HTTP_CODE=$$(curl -s -o /dev/null -w "%{http_code}" https://www.tujoyita.com); \
	if [ "$$HTTP_CODE" = "301" ] || [ "$$HTTP_CODE" = "200" ]; then \
		echo -e "  $(GREEN)✔ www redirect: $$HTTP_CODE$(NC)"; \
	else \
		echo -e "  $(RED)✗ www redirect: $$HTTP_CODE$(NC)"; \
	fi
	@SSL_EXPIRY=$$(echo | openssl s_client -servername tujoyita.com -connect tujoyita.com:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2); \
	echo -e "  SSL expira: $$SSL_EXPIRY"
	@ssh $(PROD_HOST) "cd $(PROD_DIR) && docker compose ps --format 'table {{.Name}}\t{{.Status}}'" 2>/dev/null || \
		echo -e "  $(YELLOW)⚠ No se pudo conectar al VPS$(NC)"

.PHONY: prod-logs
prod-logs: ## Ver logs de producción
	ssh $(PROD_HOST) "cd $(PROD_DIR) && docker compose logs -f --tail=100"

.PHONY: prod-shell
prod-shell: ## Abrir shell en contenedor WP de producción
	ssh -t $(PROD_HOST) "docker exec -it tujoyita_wordpress bash"

.PHONY: prod-backup
prod-backup: ## Crear backup en producción
	@echo -e "$(YELLOW)📦 Backup remoto...$(NC)"
	ssh $(PROD_HOST) "cd $(PROD_DIR) && mkdir -p backups && \
		docker exec tujoyita_mysql mysqldump \
		-u root -p\$$(grep MYSQL_ROOT_PASSWORD .env | cut -d= -f2) \
		\$$(grep MYSQL_DATABASE .env | cut -d= -f2) \
		--single-transaction | gzip > backups/db_\$$(date +%Y%m%d_%H%M%S).sql.gz"
	@echo -e "$(GREEN)✔ Backup creado en producción$(NC)"

.PHONY: prod-pull-backup
prod-pull-backup: prod-backup ## Crear backup en prod y descargarlo
	@mkdir -p $(BACKUP_DIR)/production
	@echo -e "$(YELLOW)⬇ Descargando backup...$(NC)"
	scp $(PROD_HOST):$(PROD_DIR)/backups/$$(ssh $(PROD_HOST) "ls -t $(PROD_DIR)/backups/db_*.sql.gz | head -1 | xargs basename") \
		$(BACKUP_DIR)/production/
	@echo -e "$(GREEN)✔ Backup descargado a $(BACKUP_DIR)/production/$(NC)"

##@ Git & CI

.PHONY: lint
lint: ## Ejecutar verificaciones de calidad de código
	@echo -e "$(YELLOW)🔍 PHP Syntax Check...$(NC)"
	@find data/wordpress/wp-content/mu-plugins -name "*.php" -exec php -l {} \; 2>/dev/null || true
	@find data/wordpress/wp-content/plugins/jewelry-* -name "*.php" -exec php -l {} \; 2>/dev/null || true
	@echo -e "$(GREEN)✔ PHP syntax OK$(NC)"
	@echo -e "$(YELLOW)🔍 Credentials scan...$(NC)"
	@FOUND=$$(grep -r -i -E '(password|secret|api_key|token)[\s]*=[\s]*["\x27][^"\x27]{8,}["\x27]' \
		--include="*.php" --include="*.js" --include="*.sh" \
		--exclude-dir=data/wordpress/wp-admin \
		--exclude-dir=data/wordpress/wp-includes \
		--exclude-dir=data/wordpress/wp-content/plugins/woocommerce \
		--exclude-dir=data/wordpress/wp-content/plugins/elementor \
		--exclude-dir=vendor --exclude-dir=node_modules \
		. 2>/dev/null || true); \
	if [ -n "$$FOUND" ]; then \
		echo -e "$(RED)⚠ Posibles credenciales hardcodeadas:$(NC)"; \
		echo "$$FOUND"; \
	else \
		echo -e "$(GREEN)✔ Sin credenciales hardcodeadas$(NC)"; \
	fi

.PHONY: pre-commit
pre-commit: lint ## Verificaciones antes de commit
	@echo -e "$(YELLOW)🔍 Verificando archivos sensibles...$(NC)"
	@if git diff --cached --name-only | grep -qE '^\.env$$'; then \
		echo -e "$(RED)✗ ERROR: .env está staged para commit$(NC)"; \
		exit 1; \
	fi
	@echo -e "$(GREEN)✔ Pre-commit checks passed$(NC)"

##@ Utilidades

.PHONY: test-connections
test-connections: ## Probar conexiones (MySQL, WordPress, red)
	@bash scripts/test-connections.sh

.PHONY: setup
setup: ## Configurar entorno de desarrollo desde cero
	@bash scripts/setup-dev.sh

.PHONY: clean
clean: ## Limpiar archivos temporales y cache
	@echo -e "$(YELLOW)🧹 Limpiando...$(NC)"
	@rm -rf data/wordpress/wp-content/cache/* 2>/dev/null || true
	@rm -rf data/wordpress/wp-content/upgrade/* 2>/dev/null || true
	@echo -e "$(GREEN)✔ Limpieza completa$(NC)"

.PHONY: help
help: ## Mostrar esta ayuda
	@echo ""
	@echo -e "$(GREEN)Jewelry Miami — Makefile$(NC)"
	@echo -e "$(GREEN)=========================$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf ""} \
		/^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } \
		/^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""
