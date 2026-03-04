FROM wordpress:6.9-php8.1-apache

# Instalar extensión PHP Redis para WordPress Object Cache
RUN pecl install redis \
    && docker-php-ext-enable redis

# PHP upload limits — must match the 5MB limit enforced by jewelry-dashboard.php
RUN echo "upload_max_filesize = 5M" > /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 10M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/uploads.ini
