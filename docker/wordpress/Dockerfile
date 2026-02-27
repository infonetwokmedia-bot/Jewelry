FROM wordpress:6.9-php8.1-apache

# Instalar extensión PHP Redis para WordPress Object Cache
RUN pecl install redis \
    && docker-php-ext-enable redis
